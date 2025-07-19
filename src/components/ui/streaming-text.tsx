import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface StreamingTextProps {
  text: string;
  isLoading?: boolean;
  title?: string;
}

export function StreamingText({
  text,
  isLoading = false,
  title = "Resposta",
}: StreamingTextProps) {
  if (!text && !isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-[#0B0D17] flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none">
          <p className="text-[#2E2F38] leading-relaxed whitespace-pre-wrap">
            {text}
            {isLoading && (
              <span className="inline-block w-2 h-4 bg-[#6753FF] ml-1 animate-pulse" />
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
