"use client";

import { formatDay } from "@/components/school/direction/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  changeOrganizationMemberRole,
  removeOrganizationMember,
  resendOrganizationInvitation,
  revokeOrganizationInvitation,
} from "@/services/api/workspace.service";
import type { OrganizationInvitation, OrganizationMember } from "@/shared/types/workspace";
import { cn } from "@/shared/utils/utils";
import { Info, MoreHorizontal, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { InviteMembersDialog } from "./InviteMembersDialog";
import { membersErrorMessage } from "./membersErrors";

export const MEMBERS_PAGE_SIZE = 20;

type Filter = "all" | "active" | "pending";
type Row =
  | { kind: "member"; key: string; name: string; email: string; member: OrganizationMember }
  | { kind: "invite"; key: string; name: string; email: string; invitation: OrganizationInvitation };
type Pending = { kind: "remove"; row: Extract<Row, { kind: "member" }> } | { kind: "cancel"; row: Extract<Row, { kind: "invite" }> };

const isAdminRole = (role: string) => role === "school_admin" || role === "director";

interface SchoolMembersPanelProps {
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  /** Contracted seats; 0 means no limit. */
  seatLimit: number;
  invitationsError?: string | null;
  /** Reloads members and invitations after a change. */
  onChanged: () => void;
}

/** Gestão → Membros: the school's people, its pending invitations and the seats they use. */
export function SchoolMembersPanel({ members, invitations, seatLimit, invitationsError, onChanged }: SchoolMembersPanelProps) {
  const t = useTranslations("school.members.manage");
  const tSchool = useTranslations("school");
  const locale = useLocale();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const activeCount = members.filter((m) => m.status === "active").length;
  const used = activeCount + invitations.length;
  const limited = seatLimit > 0;
  const full = limited && used >= seatLimit;

  const memberRows: Row[] = members.map((member) => ({
    kind: "member",
    key: member.membershipId,
    name: member.name || member.email || tSchool("members.unnamedMember"),
    email: member.email ?? "",
    member,
  }));
  const inviteRows: Row[] = invitations.map((invitation) => ({
    kind: "invite",
    key: invitation.id,
    name: invitation.email,
    email: invitation.email,
    invitation,
  }));
  // You first, then the invitations just sent, then everyone else in joining order.
  const rows = [
    ...memberRows.filter((r) => r.kind === "member" && r.member.currentUser),
    ...inviteRows,
    ...memberRows.filter((r) => r.kind === "member" && !r.member.currentUser),
  ];

  const showTools = rows.length > MEMBERS_PAGE_SIZE;
  const needle = query.trim().toLowerCase();
  const filtered = showTools
    ? rows.filter(
        (r) =>
          (filter === "all" ||
            (filter === "pending" ? r.kind === "invite" : r.kind === "member" && r.member.status === "active")) &&
          `${r.name} ${r.email}`.toLowerCase().includes(needle),
      )
    : rows;
  const pages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = showTools
    ? filtered.slice(currentPage * MEMBERS_PAGE_SIZE, (currentPage + 1) * MEMBERS_PAGE_SIZE)
    : filtered;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged();
    } catch (error) {
      toast.error(membersErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    if (pending.kind === "remove") {
      await run(() => removeOrganizationMember(pending.row.member.userId), t("removedToast", { name: pending.row.name }));
    } else {
      await run(() => revokeOrganizationInvitation(pending.row.invitation.id), t("cancelledToast"));
    }
    setPending(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <div className="flex items-center gap-2">
            {limited && (
              <div
                role="progressbar"
                aria-label={t("seatBarLabel")}
                aria-valuemin={0}
                aria-valuemax={seatLimit}
                aria-valuenow={Math.min(used, seatLimit)}
                className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full", full ? "bg-amber-500" : "bg-primary")}
                  style={{ width: `${Math.min(100, Math.round((used / seatLimit) * 100))}%` }}
                />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {limited ? t("seats", { used, total: seatLimit }) : t("seatsUnlimited", { used })}
            </span>
          </div>
        </div>
        <Button type="button" onClick={() => setInviteOpen(true)} disabled={full} className="w-full sm:w-auto">
          <Plus className="size-4" aria-hidden />
          {t("invite")}
        </Button>
      </div>

      {full && (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{invitations.length > 0 ? t("full", { pending: invitations.length }) : t("fullNoPending")}</span>
        </p>
      )}
      {invitationsError && <p className="text-sm text-destructive">{t("invitationsError")}</p>}

      {showTools && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={t("search")}
            aria-label={t("search")}
            className="sm:max-w-xs"
          />
          <SegmentedControl
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(0);
            }}
            ariaLabel={t("filterLabel")}
            size="sm"
            className="sm:w-auto"
            options={[
              { value: "all", label: t("filterAll") },
              { value: "active", label: t("filterActive") },
              { value: "pending", label: t("filterPending", { count: invitations.length }) },
            ]}
          />
        </div>
      )}

      <div>
        <div className="hidden items-center gap-3 border-b border-border/70 pb-2 text-xs font-medium text-muted-foreground sm:flex">
          <span className="flex-1 pl-12">{t("columnPerson")}</span>
          <span className="w-24">{t("columnRole")}</span>
          <span className="w-20">{t("columnStatus")}</span>
          <span className="w-9" />
        </div>
        {visible.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {needle ? t("noMatch", { query: query.trim() }) : t("noneInFilter")}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {visible.map((row) => {
              const isInvite = row.kind === "invite";
              const admin = isInvite ? row.invitation.role === "admin" : isAdminRole(row.member.role);
              const roleLabel = admin ? t("roleAdmin") : t("roleTeacher");
              const isMe = !isInvite && row.member.currentUser;
              const secondLine = isInvite
                ? row.invitation.createdAt
                  ? t("invitedOn", { date: formatDay(row.invitation.createdAt, locale) })
                  : t("statusPending")
                : row.email || tSchool("members.noEmail");
              const status = isInvite
                ? t("statusPending")
                : row.member.status === "active"
                  ? t("statusActive")
                  : tSchool.has(`memberStatus.${row.member.status}` as Parameters<typeof tSchool.has>[0])
                    ? tSchool(`memberStatus.${row.member.status}` as Parameters<typeof tSchool>[0])
                    : row.member.status;
              return (
                <li key={row.key} data-testid="member-row" className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isInvite ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {isInvite ? "?" : initials(row.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground" title={row.name}>
                      {row.name}
                      {isMe && <span className="font-normal text-muted-foreground"> {t("you")}</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground" title={isInvite ? undefined : row.email}>
                      {secondLine}
                    </p>
                    {row.kind === "member" && (
                      // ENG-415: last activity counts check-ins too; the direction needs it per teacher.
                      <p className="truncate text-xs text-muted-foreground">
                        {tSchool("members.joinedAndLastActive", {
                          joinedDate: row.member.joinedAt ? formatDay(row.member.joinedAt, locale, true) : "—",
                          lastActiveDate: row.member.lastActiveAt
                            ? formatDay(row.member.lastActiveAt, locale, true)
                            : tSchool("members.never"),
                        })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground sm:hidden">{roleLabel}</p>
                  </div>
                  <span className="hidden w-24 shrink-0 text-sm sm:block">{roleLabel}</span>
                  <span className="shrink-0 sm:w-20">
                    <Badge variant={isInvite ? "secondary" : row.member.status === "active" ? "default" : "outline"}>
                      {status}
                    </Badge>
                  </span>
                  <span className="w-9 shrink-0">
                    {!isMe && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            aria-label={t("actions", { name: row.name })}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {row.kind === "invite" ? (
                            <>
                              <DropdownMenuItem
                                onSelect={() => void run(() => resendOrganizationInvitation(row.invitation.id), t("resentToast"))}
                              >
                                {t("resend")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setPending({ kind: "cancel", row })}>
                                {t("cancelInvite")}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onSelect={() =>
                                  void run(
                                    () => changeOrganizationMemberRole(row.member.userId, admin ? "teacher" : "admin"),
                                    t("roleToast"),
                                  )
                                }
                              >
                                {admin ? t("makeTeacher") : t("makeAdmin")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setPending({ kind: "remove", row })}
                              >
                                {t("remove")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showTools && filtered.length > MEMBERS_PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {t("pageRange", {
              from: currentPage * MEMBERS_PAGE_SIZE + 1,
              to: Math.min(filtered.length, (currentPage + 1) * MEMBERS_PAGE_SIZE),
              total: filtered.length,
            })}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              {t("previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}

      <InviteMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        freeSeats={limited ? Math.max(0, seatLimit - used) : null}
        onInvited={onChanged}
      />
      <ConfirmationDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmPending()}
        isLoading={busy}
        variant="danger"
        title={
          pending?.kind === "cancel"
            ? t("cancelInviteTitle", { email: pending.row.email })
            : t("removeTitle", { name: pending?.row.name ?? "" })
        }
        description={pending?.kind === "cancel" ? t("cancelInviteDescription") : t("removeDescription")}
        confirmLabel={pending?.kind === "cancel" ? t("cancelInvite") : t("removeConfirm")}
        cancelLabel={pending?.kind === "cancel" ? t("keep") : undefined}
      />
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
