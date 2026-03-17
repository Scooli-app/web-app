/**
 * Moderation Queue Component
 * Admin interface for reviewing and processing submitted resources
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { SharedResource } from "@/services/api/community.service";
import type { ModerationActionRequest } from "@/services/api/moderation.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchModerationQueue,
  processModeration,
  selectIsLoadingQueue,
  selectIsProcessingAction,
  selectModerationPagination,
  selectPendingResources,
} from "@/store/moderation";
import { Check, Clock, Eye, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ModerationQueue() {
  const dispatch = useAppDispatch();
  const pendingResources = useAppSelector(selectPendingResources);
  const pagination = useAppSelector(selectModerationPagination);
  const isLoading = useAppSelector(selectIsLoadingQueue);
  const isProcessing = useAppSelector(selectIsProcessingAction);

  const [selectedResource, setSelectedResource] =
    useState<SharedResource | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    dispatch(fetchModerationQueue({ page: 0, size: 20 }));
  }, [dispatch]);

  const handleReview = (resource: SharedResource) => {
    setSelectedResource(resource);
    setIsReviewModalOpen(true);
    setFeedback("");
  };

  const handleAction = async (
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES",
  ) => {
    if (!selectedResource) return;

    const request: ModerationActionRequest = {
      resourceId: selectedResource.id,
      action,
      feedback: feedback.trim() || undefined,
    };

    try {
      await dispatch(processModeration(request)).unwrap();
      setIsReviewModalOpen(false);
      setSelectedResource(null);
      setFeedback("");

      toast.success(
        action === "APPROVE"
          ? "Recurso aprovado com sucesso!"
          : action === "REJECT"
            ? "Recurso rejeitado"
            : "Solicitadas alterações ao contribuidor",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar moderação",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i} className="animate-pulse p-4">
            <div className="mb-2 h-6 w-3/4 rounded bg-muted" />
            <div className="mb-4 h-4 w-1/2 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (pendingResources.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">Fila de moderação vazia</h3>
        <p className="text-sm text-muted-foreground">
          Não há recursos pendentes para revisão.
        </p>
      </Card>
    );
  }

  const mobileCards = (
    <div className="space-y-3">
      {pendingResources.map((resource) => (
        <div
          key={resource.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate font-medium">{resource.title}</h4>
              {resource.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {resource.description}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReview(resource)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Revisar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {resource.grade}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {resource.subject}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {new Date(resource.createdAt).toLocaleDateString("pt-PT")}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Contribuidor: {resource.contributorName}
          </p>
        </div>
      ))}
    </div>
  );

  const desktopTable = (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Contribuidor</TableHead>
            <TableHead>Currículo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingResources.map((resource) => (
            <TableRow key={resource.id}>
              <TableCell>
                <div>
                  <h4 className="font-medium">{resource.title}</h4>
                  {resource.description && (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">{resource.contributorName}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {resource.grade}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {resource.subject}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(resource.createdAt).toLocaleDateString("pt-PT")}
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReview(resource)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Revisar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Fila de Moderação</h3>
              <p className="text-sm text-muted-foreground">
                {pagination.totalCount} recursos pendentes
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                dispatch(fetchModerationQueue({ page: 0, size: 20 }))
              }
              disabled={isLoading}
            >
              Atualizar
            </Button>
          </div>
        </Card>

        <ResponsiveDataView
          mobileCardView={mobileCards}
          desktopTableView={desktopTable}
        />
      </div>

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Recurso</DialogTitle>
            <DialogDescription>
              Analise o recurso para conformidade curricular e qualidade
              pedagógica
            </DialogDescription>
          </DialogHeader>

          {selectedResource && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-semibold">Informações</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Título:</strong> {selectedResource.title}
                    </div>
                    <div>
                      <strong>Contribuidor:</strong>{" "}
                      {selectedResource.contributorName}
                    </div>
                    <div>
                      <strong>Submetido:</strong>{" "}
                      {new Date(selectedResource.createdAt).toLocaleDateString(
                        "pt-PT",
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Currículo</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedResource.grade}</Badge>
                    <Badge>{selectedResource.subject}</Badge>
                    <Badge variant="outline">
                      {selectedResource.resourceType}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedResource.description && (
                <div>
                  <h4 className="mb-2 font-semibold">Descrição</h4>
                  <p className="rounded bg-muted p-3 text-sm text-muted-foreground">
                    {selectedResource.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="mb-2 font-semibold">Conteúdo</h4>
                <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/30 p-4">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedResource.content,
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Feedback (Opcional)</h4>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback para o contribuidor sobre o recurso..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleAction("REQUEST_CHANGES")}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Solicitar Alterações
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("REJECT")}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </Button>
                <Button
                  onClick={() => handleAction("APPROVE")}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isProcessing ? "Processando..." : "Aprovar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
