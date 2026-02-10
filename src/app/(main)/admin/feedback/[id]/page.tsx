"use client";

import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import {
  addInternalNote,
  clearDetail,
  fetchFeedbackDetail,
  sendResponse,
  updateFeedbackStatus
} from "@/store/admin-feedback/adminFeedbackSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, Bug, Download, FileText, Lightbulb, Loader2, MessageSquare, Send } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TimelineItem =
  | ({ id: string; adminId: string; content: string; createdAt: string; type: "NOTE" })
  | ({ id: string; adminId: string; content: string; createdAt: string; type: "RESPONSE" });

export default function AdminFeedbackDetailArgsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = params.id as string;

  const { detail, loading } = useAppSelector((state) => state.adminFeedback);

  const [noteContent, setNoteContent] = useState("");
  const [responseContent, setResponseContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      await dispatch(fetchFeedbackDetail(id)).unwrap();
    } catch {
      toast.error("Erro ao carregar detalhe.");
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (id) loadDetail();
    return () => {
      dispatch(clearDetail());
    };
  }, [id, loadDetail, dispatch]);

  const handleStatusUpdate = async (status: FeedbackStatus) => {
    if (!detail) return;
    try {
      await dispatch(updateFeedbackStatus({ id, status, severity: detail.severity })).unwrap();
      toast.success("Estado atualizado com sucesso.");
    } catch {
      toast.error("Erro ao atualizar estado.");
    }
  };

  const handleSeverityUpdate = async (severity: BugSeverity) => {
    if (!detail) return;
    try {
      await dispatch(updateFeedbackStatus({ id, status: detail.status, severity })).unwrap();
      toast.success("Severidade atualizada com sucesso.");
    } catch {
      toast.error("Erro ao atualizar severidade.");
    }
  };

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      await dispatch(addInternalNote({ id, content: noteContent })).unwrap();
      toast.success("Nota adicionada.");
      setNoteContent("");
      loadDetail(); // Refresh to show new note
    } catch {
      toast.error("Erro ao adicionar nota.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseContent.trim()) return;
    setIsSubmittingResponse(true);
    try {
      await dispatch(sendResponse({ id, content: responseContent })).unwrap();
      toast.success("Resposta enviada.");
      setResponseContent("");
      loadDetail(); // Refresh
    } catch {
      toast.error("Erro ao enviar resposta.");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container py-8 text-center">
        <h2 className="text-xl font-semibold">Feedback não encontrado</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
             {detail.type === FeedbackType.BUG ? (
               <Bug className="h-3 w-3 text-red-500" />
             ) : (
               <Lightbulb className="h-3 w-3 text-yellow-500" />
             )}
             <span>{detail.type === FeedbackType.BUG ? "Bug Report" : "Sugestão"}</span>
             <span>•</span>
             <span>ID: {detail.id.split("-")[0]}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.title}</h1>
        </div>
        <div className="ml-auto flex gap-2">
            <FeedbackStatusBadge status={detail.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:col-span-3 gap-6">
        {/* Main Content (Left, 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Descrição</h3>
                <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm">
                  {detail.description}
                </div>
              </div>

              {detail.reproductionSteps && (
                <div>
                   <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Passos para Reproduzir</h3>
                   <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm">
                     {detail.reproductionSteps}
                   </div>
                </div>
              )}

              {detail.attachments.length > 0 && (
                <div>
                   <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Anexos ({detail.attachments.length})</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                     {detail.attachments.map(att => (
                       <div key={att.id} className="border border-accent rounded-md overflow-hidden bg-card group relative cursor-pointer" onClick={() => window.open(att.signedUrl, "_blank")}>
                         {att.fileType.startsWith("image/") ? (
                           <div className="relative h-32 w-full bg-muted border-accent">
                             <Image 
                               src={att.signedUrl} 
                               alt={att.fileName} 
                               fill
                               className="object-cover"
                             />
                           </div>
                         ) : (
                           <div className="h-32 flex items-center justify-center bg-muted">
                             <FileText className="h-10 w-10 text-muted-foreground" />
                           </div>
                         )}
                         <div className="p-2 text-xs truncate border-t border-accent flex justify-between items-center bg-muted/50">
                           <span className="truncate flex-1 mr-2" title={att.fileName}>{att.fileName}</span>
                           <a href={att.signedUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-background rounded-full transition-colors">
                             <Download className="h-3 w-3" />
                           </a>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discussion / Notes / Responses */}
          <Card>
             <CardHeader>
               <CardTitle>Histórico e Notas</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                
                {/* Internal Notes Input */}
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Nota Interna (Admin Only)
                  </h4>
                  <Textarea 
                    placeholder="Adicionar nota técnica ou observação..." 
                    className="mb-2 bg-background border-yellow-500/10 focus-visible:ring-yellow-500/20"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={handleSubmitNote} disabled={isSubmittingNote || !noteContent.trim()}>
                      {isSubmittingNote ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : null}
                      Guardar Nota
                    </Button>
                  </div>
                </div>

                {/* Public Response Input */}
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Resposta ao Utilizador
                  </h4>
                  <Textarea 
                    placeholder="Escrever resposta para o utilizador..." 
                    className="mb-2 bg-background border-blue-500/10 focus-visible:ring-blue-500/20"
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSubmitResponse} disabled={isSubmittingResponse || !responseContent.trim()}>
                      {isSubmittingResponse ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Send className="h-3 w-3 mr-2" />}
                      Enviar Resposta
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div className="space-y-4">
                   <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Histórico</h4>
                   
                   {/* Combine and sort notes and responses by date descending */}
                   {[
                     ...detail.internalNotes.map(n => ({ ...n, type: "NOTE" as const })),
                     ...detail.responses.map(r => ({ ...r, type: "RESPONSE" as const }))
                   ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item: TimelineItem) => (
                      <div key={item.id} className={`p-4 rounded-lg border ${item.type === "NOTE" ? "bg-yellow-500/5 border-yellow-500/10" : "bg-blue-500/5 border-blue-500/10"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "NOTE" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                            {item.type === "NOTE" ? "NOTA INTERNA" : "RESPOSTA PÚBLICA"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", { locale: pt })}
                          </span>
                        </div>
                        <p className="text-sm dark:text-gray-300 whitespace-pre-wrap">{item.content}</p>
                      </div>
                    ))}
                    
                    {detail.internalNotes.length === 0 && detail.responses.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem notas ou respostas.</p>
                    )}
                </div>
             </CardContent>
          </Card>
        </div>

        {/* Sidebar (Right, 1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Triagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={detail.status} onValueChange={(val) => handleStatusUpdate(val as FeedbackStatus)}>
                  <SelectTrigger className="w-full border-white/10 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FeedbackStatus.SUBMITTED}>Recebida</SelectItem>
                    <SelectItem value={FeedbackStatus.IN_REVIEW}>Em Análise</SelectItem>
                    <SelectItem value={FeedbackStatus.RESOLVED}>Resolvida</SelectItem>
                    <SelectItem value={FeedbackStatus.REJECTED}>Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {detail.type === FeedbackType.BUG && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Severidade</label>
                  <Select value={detail.severity || ""} onValueChange={(val) => handleSeverityUpdate(val as BugSeverity)}>
                    <SelectTrigger className="w-full border-white/10 bg-muted/50">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BugSeverity.LOW}>Baixa</SelectItem>
                      <SelectItem value={BugSeverity.MEDIUM}>Média</SelectItem>
                      <SelectItem value={BugSeverity.HIGH}>Alta</SelectItem>
                      <SelectItem value={BugSeverity.CRITICAL}>Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-1 text-sm bg-muted/50 p-3 rounded-lg border border-white/5">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{detail.category || detail.bugType || "-"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">{format(new Date(detail.createdAt), "dd MMM yyyy", { locale: pt })}</span>
                </div>
                {detail.updatedAt && (
                   <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Atualizado:</span>
                    <span className="font-medium">{format(new Date(detail.updatedAt), "dd MMM yyyy", { locale: pt })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
