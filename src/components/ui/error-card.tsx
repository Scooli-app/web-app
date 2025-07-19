import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "./card";

interface ErrorCardProps {
  error: string;
  title?: string;
}

export function ErrorCard({ error, title = "Erro" }: ErrorCardProps) {
  return (
    <Card className="border-[#FF4F4F] bg-[#FFECEC]">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FF4F4F] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-[#FF4F4F] mb-1">{title}</h3>
            <p className="text-[#FF4F4F] text-sm">{error}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
