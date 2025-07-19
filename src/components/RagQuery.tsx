"use client";

import { useRagQuery } from "@/hooks/useRagQuery";
import { QuestionForm } from "./forms/QuestionForm";
import { ErrorCard } from "./ui/error-card";
import { SourcesList } from "./ui/sources-list";
import { StreamingText } from "./ui/streaming-text";

export default function RagQuery() {
  const {
    question,
    setQuestion,
    answer,
    sources,
    isLoading,
    error,
    handleSubmit,
    validationError,
  } = useRagQuery();

  return (
    <div className="mx-auto space-y-6">
      <QuestionForm
        question={question}
        setQuestion={setQuestion}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        validationError={validationError}
      />

      {error && <ErrorCard error={error} />}

      <StreamingText text={answer} isLoading={isLoading} />

      <SourcesList sources={sources} />
    </div>
  );
}
