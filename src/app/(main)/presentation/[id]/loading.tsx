import { Loader2 } from "lucide-react";

export default function PresentationEditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
        <span className="text-lg text-[#6C6F80]">A carregar apresentação...</span>
      </div>
    </div>
  );
}

