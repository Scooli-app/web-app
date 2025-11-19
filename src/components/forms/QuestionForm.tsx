import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SUCCESS_MESSAGES } from "@/shared/config/constants";
import { HelpCircle } from "lucide-react";

interface QuestionFormProps {
  question: string;
  setQuestion: (question: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  validationError?: string | null;
  placeholder?: string;
  title?: string;
}

export function QuestionForm({
  question,
  setQuestion,
  onSubmit,
  isLoading,
  validationError,
  placeholder = "Ex: Quais são os objetivos de aprendizagem para Matemática no 1º ciclo?",
  title = "Consulta ao Currículo Português",
}: QuestionFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-[#0B0D17] flex items-center gap-2">
          <HelpCircle className="w-6 h-6" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="question"
              className="text-sm font-medium text-[#2E2F38]"
            >
              Pergunta sobre o currículo:
            </label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={placeholder}
              className={`w-full ${validationError ? "border-[#FF4F4F]" : ""}`}
              disabled={isLoading}
            />
            {validationError && (
              <p className="text-sm text-[#FF4F4F]">{validationError}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-6 py-3 rounded-xl font-medium"
          >
            {isLoading
              ? SUCCESS_MESSAGES.PROCESSING
              : SUCCESS_MESSAGES.ASK_QUESTION}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
