"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeachingMethod, type DocumentType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch } from "@/store/hooks";
import {
  BookOpen,
  Brain,
  Check,
  Clock,
  GraduationCap,
  Heart,
  Loader2,
  MessageSquare,
  Monitor,
  Pencil,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export interface DocumentTypeConfig {
  id: DocumentType;
  title: string;
  description: string;
  placeholder: string;
  redirectPath: string;
  generateTitlePrefix: string;
}

interface DocumentCreationPageProps {
  documentType: DocumentTypeConfig;
  userId?: string;
}

const SUBJECTS = [
  { id: "matematica", label: "Matemática", icon: "📐" },
  { id: "portugues", label: "Português", icon: "📚" },
  { id: "ciencias", label: "Ciências", icon: "🔬" },
  { id: "historia", label: "História", icon: "🏛️" },
  { id: "geografia", label: "Geografia", icon: "🌍" },
  { id: "ingles", label: "Inglês", icon: "🇬🇧" },
  { id: "artes", label: "Artes", icon: "🎨" },
  { id: "educacao_fisica", label: "Ed. Física", icon: "⚽" },
  { id: "musica", label: "Música", icon: "🎵" },
  { id: "tic", label: "TIC", icon: "💻" },
  { id: "filosofia", label: "Filosofia", icon: "🤔" },
];

const GRADE_GROUPS = [
  {
    label: "1º Ciclo",
    grades: [
      { id: "1", label: "1º ano" },
      { id: "2", label: "2º ano" },
      { id: "3", label: "3º ano" },
      { id: "4", label: "4º ano" },
    ],
  },
  {
    label: "2º Ciclo",
    grades: [
      { id: "5", label: "5º ano" },
      { id: "6", label: "6º ano" },
    ],
  },
  {
    label: "3º Ciclo",
    grades: [
      { id: "7", label: "7º ano" },
      { id: "8", label: "8º ano" },
      { id: "9", label: "9º ano" },
    ],
  },
  {
    label: "Secundário",
    grades: [
      { id: "10", label: "10º ano" },
      { id: "11", label: "11º ano" },
      { id: "12", label: "12º ano" },
    ],
  },
];

const LESSON_TIMES = [
  { id: "30", label: "30 min" },
  { id: "45", label: "45 min" },
  { id: "60", label: "60 min" },
  { id: "90", label: "90 min" },
];

const TEACHING_METHODS = [
  {
    id: TeachingMethod.ACTIVE,
    label: "Aprendizagem ativa",
    description:
      "Os alunos participam ativamente em atividades práticas e projetos colaborativos.",
    icon: Users,
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    id: TeachingMethod.LECTURE,
    label: "Aula expositiva",
    description:
      "O professor apresenta o conteúdo diretamente enquanto os alunos absorvem e tomam notas.",
    icon: BookOpen,
    color: "from-purple-500 to-violet-400",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconBg: "bg-purple-100",
  },
  {
    id: TeachingMethod.PRACTICAL,
    label: "Aprendizagem prática",
    description:
      "Mostra como o conteúdo se aplica a profissões reais, preparando os alunos para desafios do mercado.",
    icon: Zap,
    color: "from-amber-500 to-orange-400",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100",
  },
  {
    id: TeachingMethod.SOCIAL_EMOTIONAL,
    label: "Aprendizagem socioemocional",
    description:
      "Combina conteúdo académico com competências socioemocionais como empatia e trabalho em equipa.",
    icon: Heart,
    color: "from-rose-500 to-pink-400",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    iconBg: "bg-rose-100",
  },
  {
    id: TeachingMethod.INTERACTIVE,
    label: "Aprendizagem interativa",
    description:
      "Integra recursos digitais e interatividade, conectando o conteúdo à realidade dos alunos.",
    icon: Monitor,
    color: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconBg: "bg-emerald-100",
  },
];

interface FormState {
  topic: string;
  subject: string;
  grade: string;
  lessonTime?: string;
  customTime?: string;
  teachingMethod?: TeachingMethod;
  additionalDetails?: string;
}

export default function DocumentCreationPage({
  documentType,
  userId: _userId = "",
}: DocumentCreationPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formState, setFormState] = useState<FormState>({
    topic: "",
    subject: "",
    grade: "",
    lessonTime: "45",
    customTime: "",
    teachingMethod: undefined,
    additionalDetails: "",
  });
  const [isEditingCustomTime, setIsEditingCustomTime] = useState(false);
  const customTimeInputRef = useRef<HTMLInputElement>(null);

  const updateForm = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (error) {
      setError("");
    }
  };

  const buildPrompt = (): string => {
    const parts: string[] = [];

    if (formState.topic) {
      parts.push(`Tema: ${formState.topic}`);
    }

    if (formState.subject) {
      const subject = SUBJECTS.find((s) => s.id === formState.subject);
      if (subject) {
        parts.push(`Disciplina: ${subject.label}`);
      }
    }

    if (formState.grade) {
      const grade = GRADE_GROUPS.flatMap((g) => g.grades).find(
        (g) => g.id === formState.grade
      );
      if (grade) {
        parts.push(`Ano: ${grade.label}`);
      }
    }

    const duration =
      formState.lessonTime === "custom"
        ? formState.customTime
        : formState.lessonTime;
    if (duration) {
      parts.push(`Duração: ${duration} minutos`);
    }

    if (formState.teachingMethod) {
      const method = TEACHING_METHODS.find(
        (m) => m.id === formState.teachingMethod
      );
      if (method) {
        parts.push(`Metodologia: ${method.label}`);
      }
    }

    if (formState.additionalDetails?.trim()) {
      parts.push(`Detalhes adicionais: ${formState.additionalDetails}`);
    }

    return parts.join("\n");
  };

  const isFormValid = () => {
    return formState.topic.trim() && formState.subject && formState.grade;
  };

  const handleCreateDocument = async () => {
    if (!formState.topic.trim()) {
      setError("Por favor, introduza o tema da aula");
      return;
    }

    if (!formState.subject) {
      setError("Por favor, selecione uma disciplina");
      return;
    }

    if (!formState.grade) {
      setError("Por favor, selecione o ano de escolaridade");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const fullPrompt = buildPrompt();

      // Get the subject label
      const subjectValue =
        SUBJECTS.find((s) => s.id === formState.subject)?.label ||
        formState.subject;

      // Get the actual lesson time value
      const lessonTimeValue =
        formState.lessonTime === "custom"
          ? formState.customTime
          : formState.lessonTime || undefined;

      const resultAction = await dispatch(
        createDocument({
            documentType: documentType.id,
          prompt: fullPrompt,
          subject: subjectValue,
          schoolYear: formState.grade,
          lessonTime: lessonTimeValue,
          teachingMethod: formState.teachingMethod || undefined,
          additionalDetails: formState.additionalDetails?.trim() || "",
        })
      );

      if (createDocument.fulfilled.match(resultAction)) {
        const newDoc = resultAction.payload;
        dispatch(
          setPendingInitialPrompt({
            documentId: newDoc.id,
            prompt: fullPrompt,
          })
        );
        const redirectUrl = documentType.redirectPath.replace(":id", newDoc.id);
        router.push(redirectUrl);
      } else {
        setError(
          (resultAction.payload as string) ||
            "Ocorreu um erro ao criar o documento."
        );
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      if (error instanceof Error) {
        setError(`Erro ao criar o documento: ${error.message}`);
      } else {
        setError("Erro ao criar o documento.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#6753FF] to-[#8B7AFF] mb-3 sm:mb-4 shadow-lg shadow-[#6753FF]/20">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B0D17] mb-2 sm:mb-3">
            Criar {documentType.title}
          </h1>
          <p className="text-base sm:text-lg text-[#6C6F80] max-w-xl mx-auto px-2">
            {documentType.description}
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Topic Section */}
          <Card className="p-4 sm:p-6 md:p-8 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                    Tema da Aula <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6C6F80]">
                    Descreva o tema que pretende abordar
                  </p>
                </div>
              </div>
              <Input
                value={formState.topic}
                onChange={(e) => updateForm("topic", e.target.value)}
                placeholder={documentType.placeholder}
                className="w-full h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base bg-[#F4F5F8] border-[#C7C9D9] rounded-xl placeholder:text-[#6C6F80] focus:border-[#6753FF] focus:ring-[#6753FF]/20"
                aria-label="Tema da aula"
              />
            </div>
          </Card>

          {/* Subject Section - Full Width */}
          <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                  Disciplina <span className="text-red-500">*</span>
                </h2>
              </div>
              <Select
                value={formState.subject}
                onValueChange={(value) => updateForm("subject", value)}
              >
                <SelectTrigger
                  className="h-11 sm:h-12 px-4 text-sm sm:text-base bg-white border-[#C7C9D9] rounded-xl focus:border-[#6753FF] focus:ring-[#6753FF]/20"
                  aria-label="Selecionar disciplina"
                >
                  <SelectValue placeholder="Selecione uma disciplina...">
                    {formState.subject && (
                      <span className="flex items-center gap-2">
                        <span>{SUBJECTS.find(s => s.id === formState.subject)?.icon}</span>
                        <span>{SUBJECTS.find(s => s.id === formState.subject)?.label}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#C7C9D9] max-h-[280px]">
                  {SUBJECTS.map((subject) => (
                    <SelectItem
                      key={subject.id}
                      value={subject.id}
                      className="py-2.5 px-3 text-sm cursor-pointer rounded-lg focus:bg-[#EEF0FF] focus:text-[#6753FF]"
                    >
                      <span className="flex items-center gap-2">
                        <span>{subject.icon}</span>
                        <span>{subject.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Grade & Duration Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Grade Section */}
            <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                    Ano de Escolaridade <span className="text-red-500">*</span>
                  </h2>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  {GRADE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] sm:text-xs font-medium text-[#6C6F80] uppercase tracking-wide mb-1.5 sm:mb-2">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {group.grades.map((grade) => (
                          <button
                            key={grade.id}
                            type="button"
                            onClick={() =>
                              updateForm(
                                "grade",
                                formState.grade === grade.id ? "" : grade.id
                              )
                            }
                            className={cn(
                              "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all",
                              "border hover:scale-[1.02] active:scale-[0.98]",
                              formState.grade === grade.id
                                ? "bg-[#6753FF] text-white border-[#6753FF] shadow-md shadow-[#6753FF]/20"
                                : "bg-white text-[#2E2F38] border-[#C7C9D9] hover:border-[#6753FF] hover:bg-[#EEF0FF]"
                            )}
                            aria-pressed={formState.grade === grade.id}
                            aria-label={`Selecionar ${grade.label}`}
                          >
                            {grade.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Lesson Time Section */}
            <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                  Duração da Aula <span className="text-xs sm:text-sm font-normal text-[#6C6F80]">(Opcional)</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {LESSON_TIMES.map((time) => (
                  <button
                    key={time.id}
                    type="button"
                    onClick={() =>
                      updateForm(
                        "lessonTime",
                        formState.lessonTime === time.id ? "" : time.id
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all",
                      "border hover:scale-[1.02] active:scale-[0.98]",
                      formState.lessonTime === time.id
                        ? "bg-[#6753FF] text-white border-[#6753FF] shadow-md shadow-[#6753FF]/20"
                        : "bg-white text-[#2E2F38] border-[#C7C9D9] hover:border-[#6753FF] hover:bg-[#EEF0FF]"
                    )}
                    aria-pressed={formState.lessonTime === time.id}
                    aria-label={`Selecionar ${time.label}`}
                  >
                    <span>⏱️</span>
                    <span>{time.label}</span>
                  </button>
                ))}

                {/* Custom Time - "Outro" option */}
                {formState.lessonTime === "custom" && formState.customTime && !isEditingCustomTime ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingCustomTime(true);
                      setTimeout(() => customTimeInputRef.current?.focus(), 0);
                    }}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border bg-[#6753FF] text-white border-[#6753FF] shadow-md shadow-[#6753FF]/20 hover:scale-[1.02] active:scale-[0.98] group"
                    aria-label={`Duração: ${formState.customTime} min`}
                  >
                    <span>⏱️</span>
                    <span>{formState.customTime} min</span>
                    <Pencil className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100 shrink-0" />
                  </button>
                ) : formState.lessonTime === "custom" || isEditingCustomTime ? (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="relative flex items-center">
                      <input
                        ref={customTimeInputRef}
                        type="number"
                        value={formState.customTime}
                        onChange={(e) => updateForm("customTime", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && formState.customTime?.trim()) {
                            setIsEditingCustomTime(false);
                          } else if (e.key === "Escape") {
                            if (!formState.customTime?.trim()) {
                              updateForm("lessonTime", "");
                            }
                            setIsEditingCustomTime(false);
                          }
                        }}
                        onBlur={() => {
                          if (formState.customTime?.trim()) {
                            setIsEditingCustomTime(false);
                          }
                        }}
                        placeholder="75"
                        className="h-9 w-16 sm:w-20 px-2 sm:px-3 py-2 text-sm bg-[#F4F5F8] border border-[#6753FF] rounded-xl placeholder:text-[#6C6F80] focus:outline-none focus:ring-2 focus:ring-[#6753FF]/20"
                        aria-label="Duração personalizada"
                        autoFocus
                      />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-[#6C6F80]">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateForm("lessonTime", "");
                        updateForm("customTime", "");
                        setIsEditingCustomTime(false);
                      }}
                      className="p-1.5 sm:p-2 rounded-lg text-[#6C6F80] hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {formState.customTime?.trim() && (
                      <button
                        type="button"
                        onClick={() => setIsEditingCustomTime(false)}
                        className="p-1.5 sm:p-2 rounded-lg text-[#6C6F80] hover:text-[#6753FF] hover:bg-[#EEF0FF] transition-colors"
                        aria-label="Confirmar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("lessonTime", "custom");
                      setIsEditingCustomTime(true);
                      setTimeout(() => customTimeInputRef.current?.focus(), 0);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all",
                      "border hover:scale-[1.02] active:scale-[0.98]",
                      "bg-white text-[#2E2F38] border-[#C7C9D9] hover:border-[#6753FF] hover:bg-[#EEF0FF]"
                    )}
                    aria-label="Selecionar outra duração"
                  >
                    <span>⏱️</span>
                    <span>Outro</span>
                  </button>
                )}
              </div>
            </div>
          </Card>
          </div>

          {/* Teaching Method Section */}
          <Card className="p-4 sm:p-6 md:p-8 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                    Metodologia de Ensino <span className="text-xs sm:text-sm font-normal text-[#6C6F80]">(Opcional)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6C6F80]">
                    Escolha a abordagem pedagógica preferida
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {TEACHING_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = formState.teachingMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() =>
                        updateForm(
                          "teachingMethod",
                          formState.teachingMethod === method.id ? undefined : method.id as TeachingMethod
                        )
                      }
                      className={cn(
                        "relative flex sm:flex-col items-start sm:items-stretch p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all",
                        "border-2 hover:scale-[1.01] active:scale-[0.99]",
                        isSelected
                          ? `${method.bgColor} ${method.borderColor} shadow-md`
                          : "bg-white border-[#E4E4E7] hover:border-[#C7C9D9] hover:bg-[#FAFAFA]"
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Selecionar ${method.label}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#6753FF]">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl mr-3 sm:mr-0 sm:mb-3 shrink-0",
                          isSelected
                            ? method.iconBg
                            : "bg-[#F4F5F8]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6",
                            isSelected
                              ? "text-[#6753FF]"
                              : "text-[#6C6F80]"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                        <h3
                          className={cn(
                            "font-semibold text-sm sm:text-base mb-0.5 sm:mb-1",
                            isSelected ? "text-[#0B0D17]" : "text-[#2E2F38]"
                          )}
                        >
                          {method.label}
                        </h3>
                        <p
                          className={cn(
                            "text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-none",
                            isSelected ? "text-[#2E2F38]" : "text-[#6C6F80]"
                          )}
                        >
                          {method.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Additional Details Section */}
          <Card className="p-4 sm:p-6 md:p-8 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                    Detalhes Adicionais <span className="text-xs sm:text-sm font-normal text-[#6C6F80]">(Opcional)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6C6F80]">
                    Adicione informações extras para personalizar o conteúdo
                  </p>
                </div>
              </div>
              <textarea
                value={formState.additionalDetails}
                onChange={(e) =>
                  updateForm("additionalDetails", e.target.value)
                }
                placeholder="Ex: Incluir atividade de grupo, usar exemplos do dia-a-dia, focar em alunos com dificuldades..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base md:text-sm bg-[#F4F5F8] border border-[#C7C9D9] rounded-xl placeholder:text-[#6C6F80] resize-none focus:outline-none focus:border-[#6753FF] focus:ring-2 focus:ring-[#6753FF]/20 transition-all placeholder:text-sm"
                aria-label="Detalhes adicionais"
              />
            </div>
          </Card>

          {/* Error Message */}
            {error && (
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm sm:text-base text-red-700 animate-in fade-in slide-in-from-top-2 duration-200">
                {error}
              </div>
            )}

          {/* Submit Button */}
          <div className="pt-2 sm:pt-4 pb-4 sm:pb-4 space-y-3">
            <Button
              onClick={handleCreateDocument}
              disabled={isLoading || !isFormValid()}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-[#6753FF] hover:bg-[#4E3BC0] text-white rounded-xl shadow-lg shadow-[#6753FF]/20 transition-all hover:shadow-xl hover:shadow-[#6753FF]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              aria-label={`Criar ${documentType.title}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="hidden sm:inline">A criar documento...</span>
                  <span className="sm:hidden">A criar...</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Criar {documentType.title}
                </>
              )}
            </Button>
            <p className="text-center text-xs sm:text-sm text-[#6C6F80]">
              <span className="text-red-500">*</span> Campos obrigatórios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
