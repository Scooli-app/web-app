import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface SourcesListProps {
  sources: string[];
  title?: string;
}

export function SourcesList({
  sources,
  title = "Fontes Utilizadas",
}: SourcesListProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#0B0D17] flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {sources.map((source, index) => (
            <li
              key={index}
              className="text-sm text-[#6C6F80] flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 bg-[#6753FF] rounded-full flex-shrink-0" />
              {source}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
