import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, Lightbulb } from "lucide-react";
import { useState } from "react";
import { BugReportForm } from "./BugReportForm";
import { FeedbackModal } from "./FeedbackModal";
import { SuggestionForm } from "./SuggestionForm";

interface FeedbackActionCardsProps {
  onFeedbackSubmitted: () => void;
}

export function FeedbackActionCards({ onFeedbackSubmitted }: FeedbackActionCardsProps) {
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);

  const handleSuccess = () => {
    setSuggestionOpen(false);
    setBugOpen(false);
    onFeedbackSubmitted();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
        {/* Suggestion Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50"
          onClick={() => setSuggestionOpen(true)}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Lightbulb className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-xl">Tem uma ideia?</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Compartilhe as suas sugestões para novas funcionalidades ou melhorias.
            </CardDescription>
            <p className="text-sm font-medium text-primary mt-2">Enviar sugestão &rarr;</p>
          </CardContent>
        </Card>

        {/* Bug Report Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-destructive/50"
          onClick={() => setBugOpen(true)}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Bug className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">Encontrou um erro?</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Reporte problemas técnicos ou erros que encontrou na plataforma.
            </CardDescription>
            <p className="text-sm font-medium text-destructive mt-2">Reportar bug &rarr;</p>
          </CardContent>
        </Card>
      </div>

      {/* Suggestion Modal */}
      <FeedbackModal
        open={suggestionOpen}
        onOpenChange={setSuggestionOpen}
        title="Enviar Sugestão"
        description="Partilhe connosco as suas ideias para melhorar a plataforma."
      >
        <SuggestionForm 
          onSuccess={handleSuccess} 
          onCancel={() => setSuggestionOpen(false)} 
        />
      </FeedbackModal>

      {/* Bug Report Modal */}
      <FeedbackModal
        open={bugOpen}
        onOpenChange={setBugOpen}
        title="Reportar Bug"
        description="Ajude-nos a corrigir erros fornecendo detalhes sobre o problema."
      >
        <BugReportForm 
          onSuccess={handleSuccess} 
          onCancel={() => setBugOpen(false)} 
        />
      </FeedbackModal>
    </>
  );
}
