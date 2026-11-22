// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/pt-PT.json";
import type { OrganizationInvitation, OrganizationMember } from "@/shared/types/workspace";
import { ApiRequestError } from "@/services/api/client";
import { parseEmails } from "./InviteMembersDialog";
import { SchoolMembersPanel } from "./SchoolMembersPanel";

const api = vi.hoisted(() => ({
  inviteToCurrentOrganization: vi.fn(),
  resendOrganizationInvitation: vi.fn(),
  revokeOrganizationInvitation: vi.fn(),
  removeOrganizationMember: vi.fn(),
  changeOrganizationMemberRole: vi.fn(),
}));
vi.mock("@/services/api/workspace.service", () => api);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const m = messages.school.members.manage;

const member = (i: number, over: Partial<OrganizationMember> = {}): OrganizationMember => ({
  membershipId: `m${i}`,
  userId: `u${i}`,
  name: `Professor ${i}`,
  email: `prof${i}@agrupamento.pt`,
  role: "teacher",
  status: "active",
  documentsCreatedThisMonth: 0,
  totalDocuments: 0,
  sharedResourcesCount: 0,
  ...over,
});
const me = member(0, { name: "Miguel Rodrigues", role: "school_admin", currentUser: true });
const invitation = (i: number): OrganizationInvitation => ({
  id: `orginv_${i}`,
  email: `convidado${i}@agrupamento.pt`,
  role: "teacher",
  createdAt: "2026-11-20T10:00:00Z",
});

let container: HTMLDivElement;
let root: Root;
const onChanged = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function renderPanel(members: OrganizationMember[], invitations: OrganizationInvitation[], seatLimit: number) {
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="pt-PT" messages={messages}>
        <SchoolMembersPanel members={members} invitations={invitations} seatLimit={seatLimit} onChanged={onChanged} />
      </NextIntlClientProvider>,
    );
  });
}

const text = () => document.body.textContent ?? "";
const rows = () => [...document.querySelectorAll('[data-testid="member-row"]')];
const button = (label: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
const inviteButton = () => button(m.invite);
const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement;

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Radix menus open on keyboard in jsdom. */
async function openMenu(name: string) {
  const trigger = document.querySelector(`button[aria-label="${m.actions.replace("{name}", name)}"]`) as HTMLButtonElement;
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}
const menuItem = (label: string) =>
  [...document.querySelectorAll('[role="menuitem"]')].find((i) => i.textContent?.trim() === label) as HTMLElement;

describe("SchoolMembersPanel", () => {
  it("counts pending invites as used seats and marks your own row without a menu", async () => {
    await renderPanel([me, member(1)], [invitation(1)], 10);

    expect(text()).toContain("3 de 10 lugares");
    expect(text()).toContain("Miguel Rodrigues (tu)");
    expect(document.querySelector(`button[aria-label="${m.actions.replace("{name}", "Miguel Rodrigues")}"]`)).toBeNull();
    expect(inviteButton().disabled).toBe(false);
    // You first, then the pending invite, then the others.
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining("Miguel"),
      expect.stringContaining("convidado1"),
      expect.stringContaining("Professor 1"),
    ]);
  });

  it("shows no limit when the school has no seat cap", async () => {
    await renderPanel([me], [], 0);

    expect(text()).toContain("1 lugares usados · Sem limite");
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(inviteButton().disabled).toBe(false);
  });

  it("disables inviting with the reason when pending invites fill the seats", async () => {
    await renderPanel([me, member(1)], [invitation(1), invitation(2)], 4);

    expect(inviteButton().disabled).toBe(true);
    expect(text()).toContain("2 convites pendentes ocupam o resto");
  });

  it("invites the valid emails with the chosen role and refreshes", async () => {
    api.inviteToCurrentOrganization.mockResolvedValue([invitation(5), invitation(6)]);
    await renderPanel([me], [], 10);

    await act(async () => inviteButton().click());
    await typeInto(dialog().querySelector("textarea") as HTMLTextAreaElement, "Ana@Escola.pt, rui@escola.pt\nana@escola.pt");
    await act(async () => (dialog().querySelector('[role="radio"]:last-child') as HTMLButtonElement).click());
    await act(async () => button(m.dialog.send, dialog()).click());

    expect(api.inviteToCurrentOrganization).toHaveBeenCalledWith(["ana@escola.pt", "rui@escola.pt"], "admin");
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows the seat limit reason the server gives", async () => {
    api.inviteToCurrentOrganization.mockRejectedValue(new ApiRequestError("x", 409, "seat_limit_reached"));
    await renderPanel([me], [], 10);

    await act(async () => inviteButton().click());
    await typeInto(dialog().querySelector("textarea") as HTMLTextAreaElement, "ana@escola.pt");
    await act(async () => button(m.dialog.send, dialog()).click());

    expect(text()).toContain(m.errors.seat_limit_reached);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("removes a member only after confirming", async () => {
    api.removeOrganizationMember.mockResolvedValue(undefined);
    await renderPanel([me, member(1)], [], 10);

    await openMenu("Professor 1");
    expect(menuItem(m.makeAdmin)).toBeTruthy();
    await act(async () => menuItem(m.remove).click());
    expect(text()).toContain("Remover Professor 1 da escola?");
    expect(api.removeOrganizationMember).not.toHaveBeenCalled();

    await act(async () => button(m.removeConfirm, dialog()).click());

    expect(api.removeOrganizationMember).toHaveBeenCalledWith("u1");
    expect(onChanged).toHaveBeenCalled();
  });

  it("offers resend and cancel on a pending invite, and 'make teacher' on an admin", async () => {
    api.resendOrganizationInvitation.mockResolvedValue(invitation(1));
    await renderPanel([me, member(2, { role: "director" })], [invitation(1)], 10);

    await openMenu("convidado1@agrupamento.pt");
    expect(menuItem(m.cancelInvite)).toBeTruthy();
    await act(async () => menuItem(m.resend).click());
    expect(api.resendOrganizationInvitation).toHaveBeenCalledWith("orginv_1");

    await openMenu("Professor 2");
    expect(menuItem(m.makeTeacher)).toBeTruthy();
  });

  it("holds 150+ people: 20 per page, search, and the pending filter", async () => {
    const longName = "Maria da Conceição Albuquerque Figueiredo Sampaio";
    const people = [
      me,
      member(1, { name: longName, email: "maria.conceicao.figueiredo.sampaio@agrupamento-afonso-de-paiva.edu.pt" }),
      ...Array.from({ length: 150 }, (_, i) => member(i + 2)),
    ];
    await renderPanel(people, Array.from({ length: 6 }, (_, i) => invitation(i)), 158);

    expect(rows()).toHaveLength(20);
    expect(text()).toContain("1–20 de 158");
    // 152 active + 6 pending fill the 158 seats.
    expect(text()).toContain("158 de 158 lugares");
    expect(inviteButton().disabled).toBe(true);
    const long = [...document.querySelectorAll("p[title]")].find((p) => p.getAttribute("title") === longName);
    expect(long?.className).toContain("truncate");

    await act(async () => button(m.next).click());
    expect(text()).toContain("21–40 de 158");

    const search = document.querySelector('input[type="search"]') as HTMLInputElement;
    await typeInto(search, "conceição");
    expect(rows()).toHaveLength(1);

    await typeInto(search, "");
    const pendingFilter = [...document.querySelectorAll('[role="radio"]')].find(
      (b) => b.textContent === "Pendentes 6",
    ) as HTMLButtonElement;
    await act(async () => pendingFilter.click());
    expect(rows()).toHaveLength(6);
    expect(button(m.next)).toBeUndefined();
  });
});

describe("parseEmails", () => {
  it("splits on lines, commas and semicolons, lower-cases, de-duplicates and flags invalid ones", () => {
    expect(parseEmails(" Ana@Escola.pt,rui@escola.pt;\n\nana@escola.pt  nope x@y")).toEqual({
      valid: ["ana@escola.pt", "rui@escola.pt"],
      invalid: ["nope", "x@y"],
    });
  });
});
