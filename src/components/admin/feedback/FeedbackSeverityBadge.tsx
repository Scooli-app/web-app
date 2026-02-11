import { Badge } from "@/components/ui/badge";
import { BugSeverity } from "@/shared/types/feedback";

interface FeedbackSeverityBadgeProps {
  severity: BugSeverity;
}

export function FeedbackSeverityBadge({ severity }: FeedbackSeverityBadgeProps) {
  if (!severity) return null;

  switch (severity) {
    case BugSeverity.LOW:
      return <Badge variant="outline" className="text-gray-500 border-gray-500/30">Baixa</Badge>;
    case BugSeverity.MEDIUM:
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Média</Badge>;
    case BugSeverity.HIGH:
      return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Alta</Badge>;
    case BugSeverity.CRITICAL:
      return <Badge variant="destructive" className="bg-red-500/15 text-red-500 border-red-500/30 hover:bg-red-500/25">Crítica</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}
