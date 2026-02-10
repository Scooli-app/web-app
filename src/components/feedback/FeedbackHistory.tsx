import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackService } from "@/services/api/feedback.service";
import { type Feedback, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import { AlertCircle, Bug, CheckCircle2, Clock, Lightbulb, Loader2, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface FeedbackHistoryProps {
  refreshTrigger: number;
}

export function FeedbackHistory({ refreshTrigger }: FeedbackHistoryProps) {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await feedbackService.getMyFeedback();
        setFeedbackList(data);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
        setError("Não foi possível carregar o histórico.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [refreshTrigger]);

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.SUBMITTED:
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0"><Clock className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case FeedbackStatus.IN_REVIEW:
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Análise</Badge>;
      case FeedbackStatus.RESOLVED:
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Resolvido</Badge>;
      case FeedbackStatus.REJECTED:
        return <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderIcon = (type: FeedbackType) => {
    if (type === FeedbackType.SUGGESTION) {
      return (
        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
        </div>
      );
    }
    return (
      <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
        <Bug className="w-5 h-5 text-red-500" />
      </div>
    );
  };

  return (
    <Card className="mt-8 border-none shadow-none bg-transparent p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">O meu histórico</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-white/5 bg-card/50">
                <div className="flex gap-4 w-full">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-destructive gap-2 rounded-xl border border-destructive/20 bg-destructive/5">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-xl">
            Ainda não enviou nenhum feedback.
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((item) => (
              <div key={item.id}>
                <div
                  className="group flex flex-col sm:flex-row sm:items-start justify-between p-4 rounded-xl border border-white/5 bg-card/50 hover:bg-card hover:border-white/10 transition-all gap-4"
                >
                  <div className="flex gap-4">
                    {renderIcon(item.type)}
                    <div>
                      <h4 className="font-semibold text-base text-foreground/90">{item.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/60">
                        <span>
                          {new Intl.DateTimeFormat("pt-PT", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }).format(new Date(item.createdAt))}
                        </span>
                        {item.type === FeedbackType.SUGGESTION && <span>•</span>}
                        <span className="capitalize">{item.type === FeedbackType.SUGGESTION ? item.category : item.bugType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-end gap-2 pl-14 sm:pl-0">
                    {getStatusBadge(item.status)}
                  </div>
                </div>
                {/* Responses Section */}
                {item.responses && item.responses.length > 0 && (
                  <div className="ml-6 mt-4">
                    {item.responses.map((response, index) => {
                      const isLast = index === (item.responses?.length || 0) - 1;
                      return (
                        <div key={response.id} className="relative pl-6 pb-4">
                          {/* Timeline Line */}
                          <div 
                            className={`absolute left-0 top-0 w-[2px] bg-border/50 ${
                              isLast ? "h-6" : "h-full"
                            }`} 
                          />
                          
                          {/* Connector Dot */}
                          <div className="absolute -left-[5px] top-4 h-3 w-3 rounded-full border-2 border-background bg-primary/20" />
                          
                          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                <Shield className="h-3 w-3 text-primary" />
                              </div>
                              <span className="font-semibold text-primary text-xs uppercase tracking-wider">Resposta da equipa</span>
                              <span className="text-[10px] text-muted-foreground/60">•</span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {new Intl.DateTimeFormat("pt-PT", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(response.createdAt))}
                              </span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{response.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
