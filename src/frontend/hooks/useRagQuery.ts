import {
  processRagStream,
  sendRagQuery,
  validateQuestion,
} from "@/lib/rag-utils";
import { useCallback, useState } from "react";

interface UseRagQueryReturn {
  question: string;
  setQuestion: (question: string) => void;
  answer: string;
  sources: string[];
  isLoading: boolean;
  error: string;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
  validationError: string | null;
}

export function useRagQuery(): UseRagQueryReturn {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setAnswer("");
    setSources([]);
    setError("");
    setValidationError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate question
      const validationError = validateQuestion(question);
      if (validationError) {
        setValidationError(validationError);
        return;
      }

      setIsLoading(true);
      setError("");
      setValidationError(null);
      reset();

      try {
        const response = await sendRagQuery(question);

        await processRagStream(
          response,
          // onStart
          (sources) => setSources(sources),
          // onToken
          (content) => setAnswer((prev) => prev + content),
          // onEnd
          () => setIsLoading(false),
          // onError
          (errorMessage) => {
            setError(errorMessage);
            setIsLoading(false);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setIsLoading(false);
      }
    },
    [question, reset]
  );

  return {
    question,
    setQuestion,
    answer,
    sources,
    isLoading,
    error,
    handleSubmit,
    reset,
    validationError,
  };
}
