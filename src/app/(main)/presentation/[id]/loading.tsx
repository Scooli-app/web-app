import { Loader2 } from "lucide-react";

export default function PresentationEditorLoading() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">A carregar apresentação...</span>
      </div>
    </div>
  );
}
