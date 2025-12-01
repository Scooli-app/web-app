import { TeachingMethod } from "@/shared/types";
import { BookOpen, Heart, Monitor, Users, Zap } from "lucide-react";

export const SUBJECTS = [
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
] as const;

export const GRADE_GROUPS = [
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
] as const;

export const LESSON_TIMES = [
  { id: "30", label: "30 min", value: 30 },
  { id: "45", label: "45 min", value: 45 },
  { id: "60", label: "60 min", value: 60 },
  { id: "90", label: "90 min", value: 90 },
] as const;

export const TEACHING_METHODS = [
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
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type GradeGroup = (typeof GRADE_GROUPS)[number];
export type LessonTime = (typeof LESSON_TIMES)[number];
export type TeachingMethodConfig = (typeof TEACHING_METHODS)[number];
