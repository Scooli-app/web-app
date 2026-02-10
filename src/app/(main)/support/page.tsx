"use client";

import { FeedbackActionCards } from "@/components/feedback/FeedbackActionCards";
import { FeedbackHistory } from "@/components/feedback/FeedbackHistory";
import { useState } from "react";

export default function SupportPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFeedbackSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Apoio e Sugestões</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A sua opinião é fundamental para nós. Envie sugestões de melhoria ou reporte erros que encontrou na plataforma.
        </p>
      </div>

      <FeedbackActionCards onFeedbackSubmitted={handleFeedbackSubmitted} />
      
      <FeedbackHistory refreshTrigger={refreshTrigger} />
    </div>
  );
}
