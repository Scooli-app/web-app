/**
 * Per-country curriculum catalog: school years and subjects offered by each
 * country. The Portuguese data below is the original catalog moved unchanged
 * from `components/document-creation/constants.ts`; Brazil is added alongside.
 *
 * Pure data and functions only (no i18n). UI code reads labels through the
 * `useCountryCatalog()` hook, which translates Portuguese labels and keeps the
 * pt-BR strings for Brazil as they are.
 */

export type CountryCode = "PT" | "BR";

export const COUNTRY_CODES: readonly CountryCode[] = ["PT", "BR"];

/** Used whenever the country is unknown or unsupported. Portugal is the historical default. */
export const DEFAULT_COUNTRY_CODE: CountryCode = "PT";

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && (COUNTRY_CODES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Portugal (PT) - moved unchanged                                     */
/* ------------------------------------------------------------------ */

interface SubjectConfig {
  id: string;
  /**
   * Portuguese canonical name. Curriculum vocabulary is always Portuguese, so
   * this is what the quick-create free-text matcher (quickCreate.ts) searches
   * for — it is never rendered directly. For the localized display label use
   * `translateSubjectLabel(id)` / `translateSubject(value)`.
   */
  label: string;
  value: string; // English backend value
  /** Portuguese category grouping key — see `translateSubjectCategory`. */
  category: string;
}

export const SUBJECTS: SubjectConfig[] = [
  // Core subjects
  {
    id: "matematica",
    label: "Matemática",
    value: "Mathematics",
    category: "Disciplinas Gerais",
  },
  {
    id: "matematica_a",
    label: "Matemática A",
    value: "Mathematics A",
    category: "Disciplinas Gerais",
  },
  {
    id: "matematica_b",
    label: "Matemática B",
    value: "Mathematics B",
    category: "Disciplinas Gerais",
  },
  {
    id: "macs",
    label: "MACS",
    value: "Mathematics Applied to Social Sciences",
    category: "Disciplinas Gerais",
  },
  {
    id: "portugues",
    label: "Português",
    value: "Portuguese",
    category: "Disciplinas Gerais",
  },
  {
    id: "ingles",
    label: "Inglês",
    value: "English",
    category: "Disciplinas Gerais",
  },
  {
    id: "ingles_cont",
    label: "Inglês Continuação",
    value: "English Continuation",
    category: "Disciplinas Gerais",
  },

  // Sciences
  {
    id: "estudo_meio",
    label: "Estudo do Meio",
    value: "Environmental Studies",
    category: "Ciências",
  },
  {
    id: "ciencias_naturais",
    label: "Ciências Naturais",
    value: "Natural Sciences",
    category: "Ciências",
  },
  {
    id: "fq_a",
    label: "Física e Química A",
    value: "Physics and Chemistry A",
    category: "Ciências",
  },
  {
    id: "fq",
    label: "Físico-Química",
    value: "Physical Chemistry",
    category: "Ciências",
  },
  { id: "biologia", label: "Biologia", value: "Biology", category: "Ciências" },
  {
    id: "bg",
    label: "Biologia e Geologia",
    value: "Biology and Geology",
    category: "Ciências",
  },
  { id: "geologia", label: "Geologia", value: "Geology", category: "Ciências" },
  { id: "quimica", label: "Química", value: "Chemistry", category: "Ciências" },
  { id: "fisica", label: "Física", value: "Physics", category: "Ciências" },

  // Social sciences
  {
    id: "historia",
    label: "História",
    value: "History",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "historia_a",
    label: "História A",
    value: "History A",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "historia_b",
    label: "História B",
    value: "History B",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "hgp",
    label: "História e Geografia de Portugal",
    value: "History and Geography of Portugal",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "hca",
    label: "História da Cultura e das Artes",
    value: "History of Culture and Arts",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "hcd",
    label: "História, Culturas e Democracia",
    value: "History, Cultures and Democracy",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "geografia",
    label: "Geografia",
    value: "Geography",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "geografia_a",
    label: "Geografia A",
    value: "Geography A",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "geografia_c",
    label: "Geografia C",
    value: "Geography C",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "filosofia",
    label: "Filosofia",
    value: "Philosophy",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "filosofia_a",
    label: "Filosofia A",
    value: "Philosophy A",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "psicologia_b",
    label: "Psicologia B",
    value: "Psychology B",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "sociologia",
    label: "Sociologia",
    value: "Sociology",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "economia_a",
    label: "Economia A",
    value: "Economics A",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "economia_c",
    label: "Economia C",
    value: "Economics C",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "antropologia",
    label: "Antropologia",
    value: "Anthropology",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "ciencia_politica",
    label: "Ciência Política",
    value: "Political Science",
    category: "Ciências Sociais e Humanas",
  },
  {
    id: "direito",
    label: "Direito",
    value: "Law",
    category: "Ciências Sociais e Humanas",
  },

  // Languages
  { id: "frances", label: "Francês", value: "French", category: "Línguas" },
  {
    id: "frances_cont",
    label: "Francês Continuação",
    value: "French Continuation",
    category: "Línguas",
  },
  {
    id: "frances_inic",
    label: "Francês Iniciação",
    value: "French Initiation",
    category: "Línguas",
  },
  { id: "alemao", label: "Alemão", value: "German", category: "Línguas" },
  {
    id: "alemao_cont",
    label: "Alemão Continuação",
    value: "German Continuation",
    category: "Línguas",
  },
  {
    id: "alemao_inic",
    label: "Alemão Iniciação",
    value: "German Initiation",
    category: "Línguas",
  },
  { id: "espanhol", label: "Espanhol", value: "Spanish", category: "Línguas" },
  {
    id: "espanhol_cont",
    label: "Espanhol Continuação",
    value: "Spanish Continuation",
    category: "Línguas",
  },
  {
    id: "espanhol_inic",
    label: "Espanhol Iniciação",
    value: "Spanish Initiation",
    category: "Línguas",
  },
  { id: "latim_a", label: "Latim A", value: "Latin A", category: "Línguas" },
  { id: "latim_b", label: "Latim B", value: "Latin B", category: "Línguas" },
  { id: "grego", label: "Grego", value: "Greek", category: "Línguas" },
  {
    id: "plnm_a1",
    label: "Português Língua Não Materna (PLNM) - Nível A1",
    value: "Portuguese as a Non-Native Language (PLNM) - A1",
    category: "Línguas",
  },
  {
    id: "plnm_a2",
    label: "Português Língua Não Materna (PLNM) - Nível A2",
    value: "Portuguese as a Non-Native Language (PLNM) - A2",
    category: "Línguas",
  },
  {
    id: "plnm_b1",
    label: "Português Língua Não Materna (PLNM) - Nível B1",
    value: "Portuguese as a Non-Native Language (PLNM) - B1",
    category: "Línguas",
  },

  // Arts
  {
    id: "artes_visuais",
    label: "Artes Visuais",
    value: "Visual Arts",
    category: "Artes",
  },
  {
    id: "expressao_dramatica_teatro",
    label: "Expressão Dramática/Teatro",
    value: "Drama and Theater Expression",
    category: "Artes",
  },
  { id: "danca", label: "Dança", value: "Dance", category: "Artes" },
  { id: "musica", label: "Música", value: "Music", category: "Artes" },
  {
    id: "educacao_visual",
    label: "Educação Visual",
    value: "Visual Arts",
    category: "Artes",
  },
  {
    id: "educacao_musical",
    label: "Educação Musical",
    value: "Music Education",
    category: "Artes",
  },
  {
    id: "educacao_tecnologica",
    label: "Educação Tecnológica",
    value: "Technology Education",
    category: "Artes",
  },
  {
    id: "desenho_a",
    label: "Desenho A",
    value: "Drawing A",
    category: "Artes",
  },
  {
    id: "gd_a",
    label: "Geometria Descritiva A",
    value: "Descriptive Geometry A",
    category: "Artes",
  },
  {
    id: "oficina_artes",
    label: "Oficina de Artes",
    value: "Arts Workshop",
    category: "Artes",
  },
  {
    id: "oficina_design",
    label: "Oficina de Design",
    value: "Design Workshop",
    category: "Artes",
  },
  {
    id: "oficina_multimedia_b",
    label: "Oficina de Multimédia B",
    value: "Multimedia Workshop B",
    category: "Artes",
  },
  { id: "teatro", label: "Teatro", value: "Theater", category: "Artes" },
  {
    id: "materiais_tecnologias",
    label: "Materiais e Tecnologias",
    value: "Materials and Technologies",
    category: "Artes",
  },

  // Literature
  {
    id: "literatura_portuguesa",
    label: "Literatura Portuguesa",
    value: "Portuguese Literature",
    category: "Literatura",
  },
  {
    id: "classicos_literatura",
    label: "Clássicos da Literatura",
    value: "Literary Classics",
    category: "Literatura",
  },
  {
    id: "literaturas_lp",
    label: "Literaturas de Língua Portuguesa",
    value: "Portuguese-Language Literatures",
    category: "Literatura",
  },

  // Physical Education
  {
    id: "educacao_fisica",
    label: "Educação Física",
    value: "Physical Education",
    category: "Educação Física",
  },

  // Technology
  { id: "tic", label: "TIC", value: "ICT", category: "Tecnologia" },
  {
    id: "aplicacoes_informatica_b",
    label: "Aplicações Informáticas B",
    value: "Computer Applications B",
    category: "Tecnologia",
  },

  // Citizenship
  {
    id: "cidadania",
    label: "Cidadania e Desenvolvimento",
    value: "Citizenship and Development",
    category: "Cidadania",
  },

  // Religious Education
  {
    id: "emrc",
    label: "Educação Moral e Religiosa Católica",
    value: "Catholic Moral and Religious Education",
    category: "Religião",
  },
  {
    id: "emre",
    label: "Educação Moral e Religiosa Evangélica",
    value: "Evangelical Moral and Religious Education",
    category: "Religião",
  },

  // Other
];

export const GRADE_GROUPS = [
  {
    groupId: "cycle1",
    label: "1º Ciclo",
    grades: [
      { id: "1", label: "1º ano" },
      { id: "2", label: "2º ano" },
      { id: "3", label: "3º ano" },
      { id: "4", label: "4º ano" },
    ],
  },
  {
    groupId: "cycle2",
    label: "2º Ciclo",
    grades: [
      { id: "5", label: "5º ano" },
      { id: "6", label: "6º ano" },
    ],
  },
  {
    groupId: "cycle3",
    label: "3º Ciclo",
    grades: [
      { id: "7", label: "7º ano" },
      { id: "8", label: "8º ano" },
      { id: "9", label: "9º ano" },
    ],
  },
  {
    groupId: "secondary",
    label: "Secundário",
    grades: [
      { id: "10", label: "10º ano" },
      { id: "11", label: "11º ano" },
      { id: "12", label: "12º ano" },
    ],
  },
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type GradeGroup = (typeof GRADE_GROUPS)[number];

export const SUBJECTS_BY_GRADE: Record<string, Subject["id"][]> = {
  "1": [
    "portugues",
    "matematica",
    "estudo_meio",
    "artes_visuais",
    "expressao_dramatica_teatro",
    "danca",
    "musica",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "2": [
    "portugues",
    "matematica",
    "estudo_meio",
    "artes_visuais",
    "expressao_dramatica_teatro",
    "danca",
    "musica",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "3": [
    "portugues",
    "matematica",
    "estudo_meio",
    "ingles",
    "artes_visuais",
    "expressao_dramatica_teatro",
    "danca",
    "musica",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "4": [
    "portugues",
    "matematica",
    "estudo_meio",
    "ingles",
    "artes_visuais",
    "expressao_dramatica_teatro",
    "danca",
    "musica",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "5": [
    "portugues",
    "ingles",
    "hgp",
    "matematica",
    "ciencias_naturais",
    "danca",
    "educacao_visual",
    "educacao_tecnologica",
    "educacao_musical",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "6": [
    "portugues",
    "ingles",
    "hgp",
    "matematica",
    "ciencias_naturais",
    "danca",
    "educacao_visual",
    "educacao_tecnologica",
    "educacao_musical",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "7": [
    "portugues",
    "ingles",
    "frances",
    "espanhol",
    "alemao",
    "historia",
    "geografia",
    "matematica",
    "ciencias_naturais",
    "fq",
    "educacao_visual",
    "educacao_tecnologica",
    "educacao_musical",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "8": [
    "portugues",
    "ingles",
    "frances",
    "espanhol",
    "alemao",
    "historia",
    "geografia",
    "matematica",
    "ciencias_naturais",
    "fq",
    "educacao_visual",
    "educacao_tecnologica",
    "educacao_musical",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "9": [
    "portugues",
    "ingles",
    "frances",
    "espanhol",
    "alemao",
    "historia",
    "geografia",
    "matematica",
    "ciencias_naturais",
    "fq",
    "educacao_visual",
    "educacao_tecnologica",
    "educacao_musical",
    "tic",
    "educacao_fisica",
    "cidadania",
    "emrc",
    "emre",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
  ],
  "10": [
    "portugues",
    "filosofia",
    "ingles_cont",
    "alemao_cont",
    "alemao_inic",
    "espanhol_cont",
    "espanhol_inic",
    "frances_cont",
    "frances_inic",
    "educacao_fisica",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
    "desenho_a",
    "historia_a",
    "matematica_a",
    "bg",
    "economia_a",
    "fq_a",
    "geografia_a",
    "gd_a",
    "historia_b",
    "hca",
    "latim_a",
    "literatura_portuguesa",
    "macs",
    "matematica_b",
    "emrc",
    "emre",
    "cidadania",
  ],
  "11": [
    "portugues",
    "filosofia",
    "ingles_cont",
    "alemao_cont",
    "alemao_inic",
    "espanhol_cont",
    "espanhol_inic",
    "frances_cont",
    "frances_inic",
    "educacao_fisica",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
    "desenho_a",
    "historia_a",
    "matematica_a",
    "bg",
    "economia_a",
    "fq_a",
    "geografia_a",
    "gd_a",
    "historia_b",
    "hca",
    "latim_a",
    "literatura_portuguesa",
    "macs",
    "matematica_b",
    "emrc",
    "emre",
    "cidadania",
  ],
  "12": [
    "portugues",
    "educacao_fisica",
    "plnm_a1",
    "plnm_a2",
    "plnm_b1",
    "desenho_a",
    "historia_a",
    "matematica_a",
    "antropologia",
    "biologia",
    "ciencia_politica",
    "classicos_literatura",
    "direito",
    "economia_c",
    "filosofia_a",
    "fisica",
    "geografia_c",
    "geologia",
    "grego",
    "ingles_cont",
    "alemao_cont",
    "alemao_inic",
    "espanhol_cont",
    "espanhol_inic",
    "frances_cont",
    "frances_inic",
    "latim_b",
    "literaturas_lp",
    "materiais_tecnologias",
    "oficina_artes",
    "oficina_multimedia_b",
    "psicologia_b",
    "quimica",
    "sociologia",
    "aplicacoes_informatica_b",
    "oficina_design",
    "teatro",
    "hcd",
    "emrc",
    "emre",
    "cidadania",
  ],
};

export const SUBJECT_CATEGORY_ORDER = [
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

export const AMBIGUOUS_COMPONENTS_SUBJECTS = [
  "ingles_cont",
  "frances_cont",
  "frances_inic",
  "alemao_cont",
  "alemao_inic",
  "espanhol_cont",
  "espanhol_inic",
];

/* ------------------------------------------------------------------ */
/* Brazil (BR) - Ensino Fundamental (1-9) and Ensino Médio (10-12)     */
/* Subject strings are the exact pt-BR display names; the backend maps */
/* them, so id and value are the same string for Brazilian subjects.   */
/* ------------------------------------------------------------------ */

const BR_CATEGORY = "Disciplinas";

const BR_FUNDAMENTAL_SUBJECTS = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "Geografia",
  "História",
  "Arte",
  "Educação Física",
  "Ensino Religioso",
  "Língua Inglesa",
  "Computação",
];

const BR_MEDIO_SUBJECTS = [
  "Linguagens",
  "Matemática",
  "Ciências da Natureza",
  "Ciências Humanas e Sociais Aplicadas",
  "Língua Portuguesa",
  "Computação",
];

function brSubject(label: string): CatalogSubject {
  return { id: label, label, value: label, category: BR_CATEGORY };
}

const BR_SCHOOL_YEARS: SchoolYearOption[] = [
  ...Array.from({ length: 9 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1}º ano`,
  })),
  { value: 10, label: "1ª série (Ensino Médio)" },
  { value: 11, label: "2ª série (Ensino Médio)" },
  { value: 12, label: "3ª série (Ensino Médio)" },
];

const BR_SUBJECTS: CatalogSubject[] = Array.from(
  new Set([...BR_FUNDAMENTAL_SUBJECTS, ...BR_MEDIO_SUBJECTS]),
).map(brSubject);

function brSubjectIdsByYear(): Record<string, string[]> {
  const byYear: Record<string, string[]> = {};
  for (const year of BR_SCHOOL_YEARS) {
    const list = year.value <= 9 ? BR_FUNDAMENTAL_SUBJECTS : BR_MEDIO_SUBJECTS;
    byYear[String(year.value)] = [...list];
  }
  return byYear;
}

/* ------------------------------------------------------------------ */
/* Catalog shape and accessors                                         */
/* ------------------------------------------------------------------ */

export interface SchoolYearOption {
  value: number;
  label: string;
}

export interface SchoolYearGroup {
  groupId: string;
  /** Default (Portuguese/pt-BR) group label. PT labels are translated in the UI. */
  label: string;
  years: SchoolYearOption[];
}

export interface CatalogSubject {
  /** Stable id used in selections. PT: slug id. BR: the display string. */
  id: string;
  /** Default (Portuguese/pt-BR) name. PT labels are translated in the UI. */
  label: string;
  /** Backend value stored on documents and classes. */
  value: string;
  /** Grouping key for dropdowns, see `categoryOrder`. */
  category: string;
}

export interface CountryCatalog {
  countryCode: CountryCode;
  schoolYears: SchoolYearOption[];
  yearGroups: SchoolYearGroup[];
  subjects: CatalogSubject[];
  /** Subject ids offered per school year, keyed by the year as a string ("1".."12"). */
  subjectIdsByYear: Record<string, string[]>;
  /** Display order of subject categories. Categories missing here are appended. */
  categoryOrder: string[];
  /** Subject ids that need the "which component" follow-up question. */
  ambiguousSubjectIds: string[];
}

const PT_CATALOG: CountryCatalog = {
  countryCode: "PT",
  schoolYears: GRADE_GROUPS.flatMap((group) =>
    group.grades.map((grade) => ({ value: Number(grade.id), label: grade.label })),
  ),
  yearGroups: GRADE_GROUPS.map((group) => ({
    groupId: group.groupId,
    label: group.label,
    years: group.grades.map((grade) => ({ value: Number(grade.id), label: grade.label })),
  })),
  subjects: SUBJECTS,
  subjectIdsByYear: SUBJECTS_BY_GRADE,
  categoryOrder: SUBJECT_CATEGORY_ORDER,
  ambiguousSubjectIds: AMBIGUOUS_COMPONENTS_SUBJECTS,
};

const BR_CATALOG: CountryCatalog = {
  countryCode: "BR",
  schoolYears: BR_SCHOOL_YEARS,
  yearGroups: [
    {
      groupId: "fundamental",
      label: "Ensino Fundamental",
      years: BR_SCHOOL_YEARS.filter((year) => year.value <= 9),
    },
    {
      groupId: "medio",
      label: "Ensino Médio",
      // Under the "Ensino Médio" heading the stage is already said: "1ª série", not "1ª série (Ensino Médio)".
      // The flat `schoolYears` list keeps the full label for places with no heading.
      years: BR_SCHOOL_YEARS.filter((year) => year.value >= 10).map((year) => ({
        value: year.value,
        label: year.label.replace(/\s*\(Ensino Médio\)$/, ""),
      })),
    },
  ],
  subjects: BR_SUBJECTS,
  subjectIdsByYear: brSubjectIdsByYear(),
  categoryOrder: [BR_CATEGORY],
  ambiguousSubjectIds: [],
};

const CATALOGS: Record<CountryCode, CountryCatalog> = {
  PT: PT_CATALOG,
  BR: BR_CATALOG,
};

/** The catalog for a country. Unknown values fall back to Portugal. */
export function getCountryCatalog(countryCode: CountryCode | string | null | undefined): CountryCatalog {
  return isCountryCode(countryCode) ? CATALOGS[countryCode] : PT_CATALOG;
}

/** Subject ids offered for a school year. No year yet means every subject of the country. */
export function subjectIdsForYear(
  catalog: CountryCatalog,
  year: number | string | null | undefined,
): string[] {
  if (year === null || year === undefined || year === "") {
    return catalog.subjects.map((subject) => subject.id);
  }
  return catalog.subjectIdsByYear[String(year)] ?? [];
}

/** Grade options (id is the year as a string) for filters and selects. Labels are the catalog's default labels. */
export function gradeOptionsFor(
  countryCode: CountryCode | string | null | undefined,
): { value: string; label: string }[] {
  return getCountryCatalog(countryCode).schoolYears.map((year) => ({
    value: String(year.value),
    label: year.label,
  }));
}
