"use client";

import {
  GRADE_GROUPS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
} from "@/components/document-creation/constants";
import { PresentationSlideRenderer } from "@/components/presentation/PresentationSlideRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clearPresentationError,
  createPresentation,
  fetchPresentationSummaries,
} from "@/store/presentation/presentationSlice";
import { selectPresentationSummaries } from "@/store/presentation/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  CreatePresentationParams,
  PresentationSlide,
  PresentationThemeId,
} from "@/shared/types/presentation";
import { cn } from "@/shared/utils/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { presentationThemes } from "./presentation-themes";

const subjectCategoryOrder = [
  "Disciplinas Gerais",
  "Ciências",
  "Ciências Sociais e Humanas",
  "Línguas",
  "Artes",
  "Literatura",
  "Educação Física",
  "Tecnologia",
  "Cidadania",
  "Religião",
];

function buildPreviewSlide(
  title: string,
  prompt: string,
  themeId: PresentationThemeId,
): PresentationSlide {
  const selectedTheme = presentationThemes.find((theme) => theme.id === themeId);
  const bulletSeed = prompt
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: "preview-slide",
    layout: themeId === "clean-light" ? "image_focus" : "title_bullets",
    blocks: [
      {
        id: "preview-title",
        type: "title",
        slot: "header",
        content: title.trim() || "Uma apresentação pronta para editar",
      },
      {
        id: "preview-subtitle",
        type: "subtitle",
        slot: "subheader",
        content:
          prompt.trim() ||
          "A IA estrutura os slides e tu ajustas o conteúdo diretamente no canvas.",
      },
      {
        id: "preview-bullets",
        type: "bullets",
        slot: "body",
        items:
          bulletSeed.length > 0
            ? bulletSeed
            : [
                "Narrativa organizada por slides",
                "Edição inline sem formulários paralelos",
                "Exportação final para PDF com o mesmo visual",
              ],
      },
      {
        id: "preview-callout",
        type: "callout",
        slot: "supporting",
        title: selectedTheme?.name ?? "Tema",
        content:
          selectedTheme?.description ??
          "Tipografia, cor e ritmo visual mudam de forma real.",
        tone: "info",
      },
    ],
  };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "Agora mesmo";
  }

  try {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Atualizado recentemente";
  }
}

function formatGradeLevel(gradeLevel: string | null): string | null {
  if (!gradeLevel) {
    return null;
  }

  return gradeLevel.endsWith("º ano") ? gradeLevel : `${gradeLevel}º ano`;
}

export function PresentationCreatePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const summaries = useAppSelector(selectPresentationSummaries);
  const isLoading = useAppSelector((state) => state.presentation.isLoading);
  const isCreating = useAppSelector((state) => state.presentation.isCreating);

  const [form, setForm] = useState<{
    title: string;
    prompt: string;
    subject: string;
    schoolYear: number;
    themeId: PresentationThemeId;
    additionalInstructions: string;
  }>({
    title: "",
    prompt: "",
    subject: "",
    schoolYear: 0,
    themeId: "scooli-dark",
    additionalInstructions: "",
  });

  useEffect(() => {
    dispatch(clearPresentationError());
    void dispatch(fetchPresentationSummaries({ page: 1, limit: 6 }));
  }, [dispatch]);

  useEffect(() => {
    if (!form.schoolYear || !form.subject) {
      return;
    }

    const validSubjects = SUBJECTS_BY_GRADE[String(form.schoolYear)] ?? [];
    if (!validSubjects.includes(form.subject)) {
      setForm((previous) => ({ ...previous, subject: "" }));
    }
  }, [form.schoolYear, form.subject]);

  const availableSubjects = useMemo(() => {
    if (!form.schoolYear) {
      return [];
    }

    const validSubjectIds = SUBJECTS_BY_GRADE[String(form.schoolYear)] ?? [];
    return SUBJECTS.filter((subject) => validSubjectIds.includes(subject.id));
  }, [form.schoolYear]);

  const groupedSubjects = useMemo(() => {
    return availableSubjects.reduce<Record<string, typeof availableSubjects>>(
      (accumulator, subject) => {
        const category = subject.category;
        if (!accumulator[category]) {
          accumulator[category] = [];
        }
        accumulator[category].push(subject);
        return accumulator;
      },
      {},
    );
  }, [availableSubjects]);

  const previewSlide = useMemo(
    () => buildPreviewSlide(form.title, form.prompt, form.themeId),
    [form.prompt, form.themeId, form.title],
  );

  const handleCreate = async () => {
    if (!form.prompt.trim()) {
      toast.error("Descreve primeiro o tema da apresentação.");
      return;
    }

    if (!form.schoolYear) {
      toast.error("Seleciona o ano de escolaridade.");
      return;
    }

    if (!form.subject) {
      toast.error("Seleciona a disciplina.");
      return;
    }

    const normalizedSubject =
      SUBJECTS.find((subject) => subject.id === form.subject)?.value ||
      form.subject;

    const payload: CreatePresentationParams = {
      title: form.title.trim() || undefined,
      prompt: form.prompt.trim(),
      subject: normalizedSubject,
      schoolYear: form.schoolYear,
      themeId: form.themeId,
      additionalInstructions: form.additionalInstructions.trim() || undefined,
    };

    try {
      const result = await dispatch(createPresentation(payload)).unwrap();
      router.push(`/presentation/${result.id}`);
    } catch (creationError) {
      toast.error(
        creationError instanceof Error
          ? creationError.message
          : "Não foi possível criar a apresentação.",
      );
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Apresentações editáveis com IA
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Gera slides prontos, edita visualmente e exporta sem surpresas.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                A IA organiza a narrativa, escolhe layouts e devolve uma
                apresentação editável dentro do Scooli. Depois ajustas tudo
                diretamente nos slides, sem fluxo paralelo de formulários.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Canvas principal sempre visível",
                "Temas reais com tipografia e ritmo próprios",
                "Exportação PDF com o mesmo visual do editor",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground shadow-sm"
                >
                  <Wand2 className="mb-3 h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-5 rounded-[28px] border border-border/70 bg-background/70 p-5 shadow-inner">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Título da apresentação
                  </label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl bg-card"
                    placeholder="Ex.: A Peste Negra"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tema visual
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {presentationThemes.map((theme) => {
                      const isActive = theme.id === form.themeId;

                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() =>
                            setForm((previous) => ({
                              ...previous,
                              themeId: theme.id,
                            }))
                          }
                          className={cn(
                            "rounded-[18px] border p-2 text-left transition-all",
                            isActive
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border/70 hover:border-primary/30 hover:bg-accent/20",
                          )}
                        >
                          <div
                            className="h-9 rounded-xl border border-white/20"
                            style={{ background: theme.preview }}
                          />
                          <p className="mt-2 text-xs font-medium text-foreground">
                            {theme.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  O que a apresentação deve ensinar?
                </label>
                <Textarea
                  value={form.prompt}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      prompt: event.target.value,
                    }))
                  }
                  className="min-h-[140px] rounded-2xl bg-card"
                  placeholder="Ex.: Cria uma apresentação sobre a Peste Negra para o 7.º ano, com contexto histórico, sintomas, consequências sociais e um slide final de revisão."
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Ano de escolaridade
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_GROUPS.map((group) =>
                      group.grades.map((grade) => {
                        const gradeValue = Number(grade.id);
                        const isSelected = form.schoolYear === gradeValue;

                        return (
                          <button
                            key={grade.id}
                            type="button"
                            onClick={() =>
                              setForm((previous) => ({
                                ...previous,
                                schoolYear:
                                  previous.schoolYear === gradeValue
                                    ? 0
                                    : gradeValue,
                              }))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-all",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-card hover:border-primary/35 hover:bg-accent/20",
                            )}
                          >
                            {grade.label}
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Disciplina
                  </label>
                  <Select
                    value={form.subject}
                    onValueChange={(value) =>
                      setForm((previous) => ({ ...previous, subject: value }))
                    }
                    disabled={!form.schoolYear}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-card">
                      <SelectValue
                        placeholder={
                          form.schoolYear
                            ? "Selecionar disciplina"
                            : "Escolhe primeiro o ano"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectCategoryOrder.map((category) => {
                        const options = groupedSubjects[category];
                        if (!options?.length) {
                          return null;
                        }

                        return (
                          <SelectGroup key={category}>
                            <SelectLabel>{category}</SelectLabel>
                            {options.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Instruções adicionais
                </label>
                <Textarea
                  value={form.additionalInstructions}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      additionalInstructions: event.target.value,
                    }))
                  }
                  className="rounded-2xl bg-card"
                  placeholder="Ex.: inclui um slide com atividade de discussão, evita excesso de texto e usa tom confiante."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                  Depois de gerar, a edição acontece diretamente nos slides.
                </p>
                <Button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                  className="min-w-[220px]"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Gerar apresentação
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-border/70 bg-background/75 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Pré-visualização do tema
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    O slide já nasce com layout, tipografia e ritmo visual.
                  </p>
                </div>
                <Badge variant="outline">
                  {presentationThemes.find((theme) => theme.id === form.themeId)?.name}
                </Badge>
              </div>
              <PresentationSlideRenderer
                slide={previewSlide}
                themeId={form.themeId}
                assets={[]}
                readOnly
              />
            </div>

            <div className="rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Recentes
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Continua a editar apresentações já criadas.
                  </p>
                </div>
                <Link
                  href="/documents"
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Ver tudo
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {summaries.map((presentation) => (
                  <Link
                    key={presentation.id}
                    href={`/presentation/${presentation.id}`}
                    className="flex items-start justify-between gap-3 rounded-[22px] border border-border/70 bg-background/80 p-4 transition-all hover:border-primary/30 hover:bg-accent/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {presentation.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {presentation.subject}
                        {presentation.gradeLevel
                          ? ` · ${formatGradeLevel(presentation.gradeLevel)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatUpdatedAt(presentation.updatedAt)}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}

                {!isLoading && summaries.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                    Ainda não tens apresentações criadas. A primeira fica pronta
                    assim que gerares o briefing acima.
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="rounded-[22px] border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
                    A carregar apresentações recentes...
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
