import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "./card";

interface ErrorCardProps {
  error: string;
  title?: string;
}

export function ErrorCard({ error, title = "Erro" }: ErrorCardProps) {
  return (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-destructive mb-1">{title}</h3>
            <p className="text-destructive text-sm">{error}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
