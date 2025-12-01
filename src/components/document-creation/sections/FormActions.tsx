import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { DocumentTypeConfig } from "../types";

interface FormActionsProps {
  documentType: DocumentTypeConfig;
  isLoading: boolean;
  isFormValid: boolean;
  error: string;
  onSubmit: () => void;
}

export function FormActions({
  documentType,
  isLoading,
  isFormValid,
  error,
  onSubmit,
}: FormActionsProps) {
  return (
    <>
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm sm:text-base text-red-700 animate-in fade-in slide-in-from-top-2 duration-200">
          {error}
        </div>
      )}

      <div className="pt-2 sm:pt-4 pb-4 sm:pb-4 space-y-3">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !isFormValid}
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-[#6753FF] hover:bg-[#4E3BC0] text-white rounded-xl shadow-lg shadow-[#6753FF]/20 transition-all hover:shadow-xl hover:shadow-[#6753FF]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          aria-label={`Criar ${documentType.title}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="hidden sm:inline">A criar documento...</span>
              <span className="sm:hidden">A criar...</span>
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Criar {documentType.title}
            </>
          )}
        </Button>
        <p className="text-center text-xs sm:text-sm text-[#6C6F80]">
          <span className="text-red-500">*</span> Campos obrigatórios
        </p>
      </div>
    </>
  );
}

