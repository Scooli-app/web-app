"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackActionCards } from "@/components/feedback/FeedbackActionCards";
import { FeedbackHistory } from "@/components/feedback/FeedbackHistory";
import { useState } from "react";

export default function SupportPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFeedbackSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-6 md:py-8">
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          className="text-center sm:text-left"
          title="Apoio e Sugestões"
          description="A sua opinião é fundamental para nós. Envie sugestões de melhoria ou reporte erros que encontrou na plataforma."
        />

        <FeedbackActionCards onFeedbackSubmitted={handleFeedbackSubmitted} />

        <FeedbackHistory refreshTrigger={refreshTrigger} />
      </div>
    </PageContainer>
  );
}
