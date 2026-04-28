import { Routes } from "@/shared/types";
import type { DocumentTypeConfig } from "./types";

export const documentTypes: Record<string, DocumentTypeConfig> = {
  lessonPlan: {
    id: "lessonPlan",
    title: "Plano de Aula",
    description:
      "Descreva o que pretende ensinar e o Scooli irá gerar um plano de aula completo",
    placeholder:
      "Ex: Plano de aula sobre frações para o 3.º ano, incluindo atividades práticas e avaliação",
    redirectPath: Routes.LESSON_PLAN_EDITOR,
    generateTitlePrefix: "Plano de Aula",
  },
  quiz: {
    id: "quiz",
    title: "Quiz",
    description:
      "Descreva o que pretende avaliar e o Scooli irá gerar um quiz interativo",
    placeholder:
      "Ex: Quiz sobre história de Portugal para o 2.º ciclo, com 15 questões de escolha múltipla",
    redirectPath: Routes.QUIZ_EDITOR,
    generateTitlePrefix: "Quiz",
  },
  test: {
    id: "test",
    title: "Teste",
    description:
      "Descreva o que pretende avaliar e o Scooli irá gerar um teste completo",
    placeholder:
      "Ex: Teste sobre frações para o 3.º ano, com 10 questões de escolha múltipla e 2 problemas",
    redirectPath: Routes.TEST_EDITOR,
    generateTitlePrefix: "Teste",
  },
  worksheet: {
    id: "worksheet",
    title: "Ficha de Trabalho",
    description:
      "Descreva a finalidade da ficha e o Scooli irá gerar uma ficha de trabalho pronta a usar",
    placeholder:
      "Ex: Ficha de trabalho sobre frações para o 3.º ano, com instruções claras, tarefas adequadas ao objetivo e fecho final",
    redirectPath: Routes.WORKSHEET_EDITOR,
    generateTitlePrefix: "Ficha de Trabalho",
  },
  presentation: {
    id: "presentation",
    title: "Apresentação",
    description:
      "Descreva o tema da apresentação e o Scooli irá gerar slides interativos",
    placeholder:
      "Ex: Apresentação sobre o sistema solar para o 4.º ano, com 10 slides ilustrados",
    redirectPath: Routes.PRESENTATION_EDITOR,
    generateTitlePrefix: "Apresentação",
  },
};
