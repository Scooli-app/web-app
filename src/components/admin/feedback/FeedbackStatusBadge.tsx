import { Badge } from "@/components/ui/badge";
import { FeedbackStatus } from "@/shared/types/feedback";
import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus;
}

export function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  switch (status) {
    case FeedbackStatus.SUBMITTED:
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0">
          <Clock className="w-3 h-3 mr-1" /> Recebida
        </Badge>
      );
    case FeedbackStatus.IN_REVIEW:
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">
          <CircleDashed className="w-3 h-3 mr-1 animate-spin-slow" /> Em Análise
        </Badge>
      );
    case FeedbackStatus.RESOLVED:
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-0">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolvida
        </Badge>
      );
    case FeedbackStatus.REJECTED:
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0">
          <XCircle className="w-3 h-3 mr-1" /> Rejeitada
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
