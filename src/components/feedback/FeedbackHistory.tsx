import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { feedbackService } from "@/services/api/feedback.service";
import { type Feedback, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import { AlertCircle, Bug, CheckCircle2, Clock, Lightbulb, Loader2, XCircle } from "lucide-react";
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
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200"><Clock className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case FeedbackStatus.IN_REVIEW:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Em Análise</Badge>;
      case FeedbackStatus.RESOLVED:
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Resolvido</Badge>;
      case FeedbackStatus.REJECTED:
        return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
    return type === FeedbackType.SUGGESTION ? (
      <Lightbulb className="w-5 h-5 text-yellow-600" />
    ) : (
      <Bug className="w-5 h-5 text-red-600" />
    );
  };

  if (isLoading && feedbackList.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>O meu histórico</CardTitle>
      </CardHeader>
      <CardContent>
        {feedbackList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Ainda não enviou nenhum feedback.
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="mt-1 p-2 bg-muted rounded-full">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-base">{item.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        {new Intl.DateTimeFormat("pt-PT", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(item.createdAt))}
                      </span>
                      <span>•</span>
                      <span>{item.type === FeedbackType.SUGGESTION ? item.category : item.bugType}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
