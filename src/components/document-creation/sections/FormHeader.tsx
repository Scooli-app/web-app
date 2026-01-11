import { Sparkles } from "lucide-react";
import type { DocumentTypeConfig } from "../types";

interface FormHeaderProps {
  documentType: DocumentTypeConfig;
}

export function FormHeader({ documentType }: FormHeaderProps) {
  return (
    <div className="text-center mb-6 sm:mb-10">
      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-3 sm:mb-4 shadow-lg shadow-primary/20">
        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
      </div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
        Criar {documentType.title}
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
        {documentType.description}
      </p>
    </div>
  );
}
