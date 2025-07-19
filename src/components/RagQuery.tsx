"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface StreamResponse {
  type: "start" | "token" | "end" | "error";
  content?: string;
  sources?: string[];
  error?: string;
}

export default function RagQuery() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      return;
    }

    setIsLoading(true);
    setAnswer("");
    setSources([]);
    setError("");

    try {
      const response = await fetch("/api/rag-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar pergunta");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Não foi possível iniciar o stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: StreamResponse = JSON.parse(line.slice(6));

              switch (data.type) {
                case "start":
                  setSources(data.sources || []);
                  break;
                case "token":
                  setAnswer((prev) => prev + (data.content || ""));
                  break;
                case "end":
                  setIsLoading(false);
                  break;
                case "error":
                  setError(data.error || "Erro desconhecido");
                  setIsLoading(false);
                  break;
              }
            } catch (e) {
              console.error("Erro ao processar stream:", e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#0B0D17]">
            Consulta ao Currículo Português
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Ex: Quais são os objetivos de aprendizagem para Matemática no 1º ciclo?"
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-6 py-3 rounded-xl font-medium"
            >
              {isLoading ? "A processar..." : "Perguntar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-[#FF4F4F] bg-[#FFECEC]">
          <CardContent className="pt-6">
            <p className="text-[#FF4F4F] font-medium">Erro: {error}</p>
          </CardContent>
        </Card>
      )}

      {answer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#0B0D17]">
              Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-[#2E2F38] leading-relaxed whitespace-pre-wrap">
                {answer}
                {isLoading && (
                  <span className="inline-block w-2 h-4 bg-[#6753FF] ml-1 animate-pulse" />
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0B0D17]">
              Fontes Utilizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sources.map((source, index) => (
                <li key={index} className="text-sm text-[#6C6F80]">
                  • {source}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
