import { TeachingMethod } from "@/shared/types";
import { BookOpen, Heart, Monitor, Users, Zap } from "lucide-react";

export interface SubjectConfig {
  id: string;
  label: string; // Portuguese display name
  value: string; // English backend value
  category: string;
}

export const SUBJECTS: SubjectConfig[] = [
  // Core subjects
  { id: "matematica", label: "Matemática", value: "Mathematics", category: "Disciplinas Gerais" },
  { id: "matematica_a", label: "Matemática A", value: "Mathematics A", category: "Disciplinas Gerais" },
  { id: "matematica_b", label: "Matemática B", value: "Mathematics B", category: "Disciplinas Gerais" },
  { id: "macs", label: "MACS", value: "Mathematics Applied to Social Sciences", category: "Disciplinas Gerais" },
  { id: "portugues", label: "Português", value: "Portuguese", category: "Disciplinas Gerais" },
  { id: "ingles", label: "Inglês", value: "English", category: "Disciplinas Gerais" },
  { id: "ingles_cont", label: "Inglês Continuação", value: "English Continuation", category: "Disciplinas Gerais" },

  // Sciences
  { id: "estudo_meio", label: "Estudo do Meio", value: "Environmental Studies", category: "Ciências" },
  { id: "ciencias_naturais", label: "Ciências Naturais", value: "Natural Sciences", category: "Ciências" },
  { id: "fq_a", label: "Física e Química A", value: "Physics and Chemistry A", category: "Ciências" },
  { id: "fq", label: "Físico-Química", value: "Physical Chemistry", category: "Ciências" },
  { id: "biologia", label: "Biologia", value: "Biology", category: "Ciências" },
  { id: "bg", label: "Biologia e Geologia", value: "Biology and Geology", category: "Ciências" },
  { id: "geologia", label: "Geologia", value: "Geology", category: "Ciências" },
  { id: "quimica", label: "Química", value: "Chemistry", category: "Ciências" },
  { id: "fisica", label: "Física", value: "Physics", category: "Ciências" },

  // Social sciences
  { id: "historia", label: "História", value: "History", category: "Ciências Sociais e Humanas" },
  { id: "historia_a", label: "História A", value: "History A", category: "Ciências Sociais e Humanas" },
  { id: "historia_b", label: "História B", value: "History B", category: "Ciências Sociais e Humanas" },
  { id: "hgp", label: "História e Geografia de Portugal", value: "History and Geography of Portugal", category: "Ciências Sociais e Humanas" },
  { id: "hca", label: "História da Cultura e das Artes", value: "History of Culture and Arts", category: "Ciências Sociais e Humanas" },
  { id: "hcd", label: "História, Culturas e Democracia", value: "History, Cultures and Democracy", category: "Ciências Sociais e Humanas" },
  { id: "geografia", label: "Geografia", value: "Geography", category: "Ciências Sociais e Humanas" },
  { id: "geografia_a", label: "Geografia A", value: "Geography A", category: "Ciências Sociais e Humanas" },
  { id: "geografia_c", label: "Geografia C", value: "Geography C", category: "Ciências Sociais e Humanas" },
  { id: "filosofia", label: "Filosofia", value: "Philosophy", category: "Ciências Sociais e Humanas" },
  { id: "filosofia_a", label: "Filosofia A", value: "Philosophy A", category: "Ciências Sociais e Humanas" },
  { id: "psicologia_b", label: "Psicologia B", value: "Psychology B", category: "Ciências Sociais e Humanas" },
  { id: "sociologia", label: "Sociologia", value: "Sociology", category: "Ciências Sociais e Humanas" },
  { id: "economia_a", label: "Economia A", value: "Economia A", category: "Ciências Sociais e Humanas" },
  { id: "economia_c", label: "Economia C", value: "Economics C", category: "Ciências Sociais e Humanas" },
  { id: "antropologia", label: "Antropologia", value: "Anthropology", category: "Ciências Sociais e Humanas" },
  { id: "ciencia_politica", label: "Ciência Política", value: "Political Science", category: "Ciências Sociais e Humanas" },
  { id: "direito", label: "Direito", value: "Law", category: "Ciências Sociais e Humanas" },

  // Languages
  { id: "frances", label: "Francês", value: "French", category: "Línguas" },
  { id: "frances_cont", label: "Francês Continuação", value: "French Continuation", category: "Línguas" },
  { id: "frances_inic", label: "Francês Iniciação", value: "French Initiation", category: "Línguas" },
  { id: "alemao", label: "Alemão", value: "German", category: "Línguas" },
  { id: "alemao_cont", label: "Alemão Continuação", value: "German Continuation", category: "Línguas" },
  { id: "alemao_inic", label: "Alemão Iniciação", value: "German Initiation", category: "Línguas" },
  { id: "espanhol", label: "Espanhol", value: "Spanish", category: "Línguas" },
  { id: "espanhol_cont", label: "Espanhol Continuação", value: "Spanish Continuation", category: "Línguas" },
  { id: "espanhol_inic", label: "Espanhol Iniciação", value: "Spanish Initiation", category: "Línguas" },
  { id: "latim_a", label: "Latim A", value: "Latin A", category: "Línguas" },
  { id: "latim_b", label: "Latim B", value: "Latin B", category: "Línguas" },
  { id: "grego", label: "Grego", value: "Greek", category: "Línguas" },
  { id: "plnm", label: "Português Língua Não Materna (PLNM)", value: "Portuguese as a Non-Native Language (PLNM)", category: "Línguas" },

  // Arts
  { id: "educacao_visual", label: "Educação Visual", value: "Visual Arts", category: "Artes" },
  { id: "educacao_musical", label: "Educação Musical", value: "Music Education", category: "Artes" },
  { id: "educacao_tecnologica", label: "Educação Tecnológica", value: "Technology Education", category: "Artes" },
  { id: "desenho_a", label: "Desenho A", value: "Drawing A", category: "Artes" },
  { id: "gd_a", label: "Geometria Descritiva A", value: "Descriptive Geometry A", category: "Artes" },
  { id: "oficina_artes", label: "Oficina de Artes", value: "Arts Workshop", category: "Artes" },
  { id: "oficina_design", label: "Oficina de Design", value: "Design Workshop", category: "Artes" },
  { id: "oficina_multimedia_b", label: "Oficina de Multimédia B", value: "Multimedia Workshop B", category: "Artes" },
  { id: "teatro", label: "Teatro", value: "Theater", category: "Artes" },
  { id: "materiais_tecnologias", label: "Materiais e Tecnologias", value: "Materials and Technologies", category: "Artes" },

  // Literature
  { id: "literatura_portuguesa", label: "Literatura Portuguesa", value: "Portuguese Literature", category: "Literatura" },
  { id: "classicos_literatura", label: "Clássicos da Literatura", value: "Literary Classics", category: "Literatura" },

  // Physical Education
  { id: "educacao_fisica", label: "Educação Física", value: "Physical Education", category: "Educação Física" },

  // Technology
  { id: "tic", label: "TIC", value: "ICT", category: "Tecnologia" },
  { id: "aplicacoes_informatica_b", label: "Aplicações Informáticas B", value: "Computer Applications B", category: "Tecnologia" },

  // Citizenship
  { id: "cidadania", label: "Cidadania e Desenvolvimento", value: "Citizenship and Development", category: "Cidadania" },
  { id: "cidadania_pdf", label: "Cidadania e Desenvolvimento PDF", value: "Citizenship and Development PDF", category: "Cidadania" },

  // Religious Education
  { id: "emrc", label: "Educação Moral e Religiosa Católica", value: "Catholic Moral and Religious Education", category: "Religião" },
  { id: "emre", label: "Educação Moral e Religiosa Evangélica", value: "Evangelical Moral and Religious Education", category: "Religião" },

  // Other
];

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

export const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "1": ["portugues", "matematica", "estudo_meio", "educacao_visual", "educacao_musical", "educacao_fisica"],
  "2": ["portugues", "matematica", "estudo_meio", "educacao_visual", "educacao_musical", "educacao_fisica"],
  "3": ["portugues", "matematica", "estudo_meio", "ingles", "educacao_visual", "educacao_musical", "educacao_fisica"],
  "4": ["portugues", "matematica", "estudo_meio", "ingles", "educacao_visual", "educacao_musical", "educacao_fisica"],
  "5": ["portugues", "ingles", "hgp", "matematica", "ciencias_naturais", "educacao_visual", "educacao_tecnologica", "educacao_musical", "educacao_fisica", "cidadania", "emrc"],
  "6": ["portugues", "ingles", "hgp", "matematica", "ciencias_naturais", "educacao_visual", "educacao_tecnologica", "educacao_musical", "educacao_fisica", "cidadania", "emrc"],
  "7": ["portugues", "ingles", "frances_inic", "espanhol_inic", "alemao_inic", "historia", "geografia", "matematica", "ciencias_naturais", "fq", "educacao_visual", "tic", "educacao_fisica", "cidadania"],
  "8": ["portugues", "ingles", "frances_inic", "espanhol_inic", "alemao_inic", "historia", "geografia", "matematica", "ciencias_naturais", "fq", "educacao_visual", "tic", "educacao_fisica", "cidadania"],
  "9": ["portugues", "ingles", "frances_inic", "espanhol_inic", "alemao_inic", "historia", "geografia", "matematica", "ciencias_naturais", "fq", "educacao_visual", "tic", "educacao_fisica", "cidadania"],
  "10": ["portugues", "ingles_cont", "filosofia", "educacao_fisica", "matematica_a", "matematica_b", "macs", "fq_a", "bg", "gd_a", "historia_a", "geografia_a", "economia_a", "desenho_a", "hca", "latim_a"],
  "11": ["portugues", "ingles_cont", "filosofia", "educacao_fisica", "matematica_a", "matematica_b", "macs", "fq_a", "bg", "gd_a", "historia_a", "geografia_a", "economia_a", "desenho_a", "hca", "latim_a"],
  "12": ["portugues", "educacao_fisica", "matematica_a", "historia_a", "desenho_a", "biologia", "geologia", "fisica", "quimica", "economia_c", "geografia_c", "sociologia", "psicologia_b", "filosofia_a", "direito", "ciencia_politica", "antropologia", "ingles", "espanhol", "frances", "alemao", "aplicacoes_informatica_b", "oficina_multimedia_b"]
};
