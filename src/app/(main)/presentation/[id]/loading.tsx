import { Loader2 } from "lucide-react";

export default function PresentationEditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">A carregar apresentação...</span>
      </div>
    </div>
  );
}

