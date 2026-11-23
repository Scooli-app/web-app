import { Routes } from "@/shared/types";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryCatalog,
  type CountryCode,
} from "@/lib/curriculum/countryCatalog";

export type QuickCreateDocumentType =
  | "lessonPlan"
  | "quiz"
  | "test"
  | "worksheet";

export interface QuickCreateParse {
  documentType: QuickCreateDocumentType;
  /** Full original text, as typed — the Tema field gets stripParsedTokens(topic) */
  topic: string;
  schoolYear?: number;
  subjectId?: string;
}

const CREATION_ROUTES: Record<QuickCreateDocumentType, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  quiz: Routes.QUIZ,
  test: Routes.TEST,
  worksheet: Routes.WORKSHEET,
};

type TypeKeywords = { type: QuickCreateDocumentType; keywords: string[] }[];

const PT_TYPE_KEYWORDS: TypeKeywords = [
  { type: "lessonPlan", keywords: ["plano de aula", "plano"] },
  { type: "worksheet", keywords: ["ficha de trabalho", "ficha"] },
  { type: "test", keywords: ["teste"] },
  { type: "quiz", keywords: ["quiz"] },
];

/** Brazilian words for the same documents: "prova" is the usual word for a test, "lista de exercícios" for a worksheet. */
const BR_TYPE_KEYWORDS: TypeKeywords = [
  { type: "lessonPlan", keywords: ["plano de aula", "plano"] },
  { type: "worksheet", keywords: ["ficha de trabalho", "lista de exercicios", "ficha"] },
  { type: "test", keywords: ["prova", "teste"] },
  { type: "quiz", keywords: ["quiz"] },
];

/** Lowercase + strip accents so "Matemática" matches "matematica" */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary-aware index of a normalized keyword in normalized text.
 * Tolerates a plural suffix ("planos", "fichas", "testes").
 */
function indexOfKeyword(haystack: string, keyword: string): number {
  const re = new RegExp(
    `(?<![a-z0-9])${escapeRegExp(keyword)}(?:e?s)?(?![a-z0-9])`,
  );
  const match = re.exec(haystack);
  return match ? match.index : -1;
}

/**
 * High-confidence topical cues that imply a subject even when the subject
 * itself is never named — e.g. "Os Lusíadas" clearly means Português. Curated
 * to well-known curriculum topics, not exhaustive: this is a fallback for
 * when the exact-label match above finds nothing, not a replacement for it.
 */
const PT_SUBJECT_TOPIC_KEYWORDS: { subjectId: string; keywords: string[] }[] = [
  {
    subjectId: "portugues",
    keywords: [
      "lusiadas", "camoes", "fernando pessoa", "eca de queiros", "eca de queiroz",
      "jose saramago", "sophia de mello breyner", "gil vicente",
      "cesario verde", "almeida garrett", "auto da barca", "memorial do convento",
      "mensagem", "os maias", "frei luis de sousa",
    ],
  },
  {
    subjectId: "historia",
    keywords: [
      "revolucao francesa", "segunda guerra mundial", "primeira guerra mundial",
      "revolucao industrial", "descobrimentos", "estado novo", "25 de abril",
      "guerra fria", "idade media", "renascimento",
    ],
  },
  {
    subjectId: "ciencias_naturais",
    keywords: ["fotossintese", "sistema solar", "ciclo da agua", "ecossistema"],
  },
  {
    subjectId: "matematica",
    keywords: ["fracoes", "equacoes", "trigonometria", "numeros primos"],
  },
  {
    subjectId: "geografia",
    keywords: ["placas tectonicas", "uniao europeia"],
  },
];

/** Brazilian subject ids are the display names; topics are keyed by those names. */
const BR_SUBJECT_TOPIC_KEYWORDS: { subjectId: string; keywords: string[] }[] = [
  {
    subjectId: "Língua Portuguesa",
    keywords: ["lusiadas", "camoes", "machado de assis", "graciliano ramos", "clarice lispector"],
  },
  {
    subjectId: "História",
    keywords: [
      "revolucao francesa", "segunda guerra mundial", "primeira guerra mundial",
      "revolucao industrial", "guerra fria", "idade media", "renascimento",
      "ditadura militar", "independencia do brasil", "proclamacao da republica", "era vargas",
    ],
  },
  {
    subjectId: "Ciências",
    keywords: ["fotossintese", "sistema solar", "ciclo da agua", "ecossistema"],
  },
  {
    subjectId: "Matemática",
    keywords: ["fracoes", "equacoes", "trigonometria", "numeros primos"],
  },
  {
    subjectId: "Geografia",
    keywords: ["placas tectonicas", "uniao europeia"],
  },
];

/**
 * Brazilian synonyms a teacher types for a subject, keyed by the subject id
 * (its display name). Normalized, like the labels.
 */
const BR_SUBJECT_SYNONYMS: Record<string, string[]> = {
  "Língua Portuguesa": ["portugues"],
  "Língua Inglesa": ["ingles"],
  Arte: ["artes visuais", "educacao artistica"],
  "Educação Física": ["ed fisica", "ed. fisica"],
  "Ensino Religioso": ["religiao"],
  Ciências: ["ciencias naturais"],
  Computação: ["informatica"],
  "Ciências da Natureza": ["biologia", "fisica", "quimica"],
  "Ciências Humanas e Sociais Aplicadas": ["ciencias humanas", "filosofia", "sociologia"],
};

interface MatchConfig {
  typeKeywords: TypeKeywords;
  /** Subject search terms, longest first: a normalized term and the subject id it names. */
  subjectTerms: { term: string; subjectId: string }[];
  subjectTopicKeywords: { subjectId: string; keywords: string[] }[];
  /** Regex source for the year phrase that the Tema field should drop. */
  yearPhrase: string;
}

const PT_YEAR_PHRASE = String.raw`(?:(?:para|do|da|de|no|na)\s+(?:o\s+|a\s+)?)?\d{1,2}\s*(?:\.\s*)?(?:[ºo°]\s*)?ano\b`;
const BR_YEAR_PHRASE = String.raw`(?:(?:para|do|da|de|no|na)\s+(?:o\s+|a\s+)?)?(?:\d{1,2}\s*(?:\.\s*)?(?:[ºo°]\s*)?ano\b|[123]\s*[ªº°a]?\s*serie\b|(?:primeira|segunda|terceira)\s+serie\b)`;

const matchConfigs = new Map<CountryCode, MatchConfig>();

/** Subject terms per country. Longest raw label first, so "Matemática A" wins over "Matemática". */
function matchConfigFor(countryCode: CountryCode): MatchConfig {
  const cached = matchConfigs.get(countryCode);
  if (cached) return cached;

  const catalog = getCountryCatalog(countryCode);
  const isBr = catalog.countryCode === "BR";
  const entries = catalog.subjects.flatMap((subject) => {
    const synonyms = isBr ? BR_SUBJECT_SYNONYMS[subject.id] ?? [] : [];
    return [
      { term: normalize(subject.label), rank: subject.label.length, subjectId: subject.id },
      ...synonyms.map((term) => ({ term, rank: term.length, subjectId: subject.id })),
    ];
  });
  const config: MatchConfig = {
    typeKeywords: isBr ? BR_TYPE_KEYWORDS : PT_TYPE_KEYWORDS,
    subjectTerms: entries
      .sort((a, b) => b.rank - a.rank)
      .map(({ term, subjectId }) => ({ term, subjectId })),
    subjectTopicKeywords: isBr ? BR_SUBJECT_TOPIC_KEYWORDS : PT_SUBJECT_TOPIC_KEYWORDS,
    yearPhrase: isBr ? BR_YEAR_PHRASE : PT_YEAR_PHRASE,
  };
  matchConfigs.set(countryCode, config);
  return config;
}

const BR_SERIES_ORDINALS: Record<string, number> = { primeira: 10, segunda: 11, terceira: 12 };

/**
 * The school year named in normalized text. PT: "3.º ano". BR: "6º ano" for
 * the Ensino Fundamental, "1ª série" (or "primeira série") for the Ensino Médio,
 * and "1º ano do ensino médio" shifted to the 10.º.
 */
function parseSchoolYear(norm: string, countryCode: CountryCode): number | undefined {
  if (countryCode === "BR") {
    const series = norm.match(/\b([123])\s*[ªº°a]?\s*serie\b/);
    if (series) return 9 + Number(series[1]);
    const ordinal = norm.match(/\b(primeira|segunda|terceira)\s+serie\b/);
    if (ordinal) return BR_SERIES_ORDINALS[ordinal[1]];
  }

  // School year: "3.º ano", "3º ano", "3o ano", "3 ano"
  const yearMatch = norm.match(/\b(\d{1,2})\s*(?:\.\s*)?(?:[ºo°]\s*)?ano\b/);
  if (!yearMatch) return undefined;
  let year = Number(yearMatch[1]);
  if (countryCode === "BR" && year <= 3 && /\bmedio\b/.test(norm)) year += 9;
  return year >= 1 && year <= 12 ? year : undefined;
}

/**
 * Best-effort extraction of document type, school year and subject from a
 * teacher's free-text request (e.g. "plano de aula sobre frações para o 3.º ano").
 *
 * Vague inputs like "frações" are fine: the type falls back to lesson plan and
 * year/subject stay undefined — the creation form asks for whatever is missing.
 * The country picks the vocabulary: Portuguese curriculum names or Brazilian ones.
 */
export function parseQuickCreate(
  input: string,
  countryCode: CountryCode = DEFAULT_COUNTRY_CODE,
): QuickCreateParse {
  const topic = input.trim();
  const norm = normalize(topic);
  const config = matchConfigFor(countryCode);
  const catalog = getCountryCatalog(countryCode);

  // Document type: earliest keyword occurrence wins
  let documentType: QuickCreateDocumentType = "lessonPlan";
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const { type, keywords } of config.typeKeywords) {
    for (const keyword of keywords) {
      const index = indexOfKeyword(norm, keyword);
      if (index !== -1 && index < bestIndex) {
        bestIndex = index;
        documentType = type;
      }
    }
  }

  const schoolYear = parseSchoolYear(norm, countryCode);

  // Subject: explicit mention of a known subject label or synonym
  let subjectId: string | undefined;
  for (const { term, subjectId: sid } of config.subjectTerms) {
    if (indexOfKeyword(norm, term) !== -1) {
      subjectId = sid;
      break;
    }
  }

  // Fallback: no subject named outright, but a well-known topic implies one
  // (e.g. "Camões" implies Português) — see the topic keyword lists above.
  if (!subjectId) {
    for (const { subjectId: sid, keywords } of config.subjectTopicKeywords) {
      if (keywords.some((keyword) => indexOfKeyword(norm, keyword) !== -1)) {
        subjectId = sid;
        break;
      }
    }
  }

  // Drop the subject if it doesn't exist for the detected year (e.g.
  // "matemática" in the 10.º ano, where only Matemática A/B exist) —
  // the form would reset it anyway.
  if (subjectId && schoolYear) {
    const validSubjects = catalog.subjectIdsByYear[String(schoolYear)];
    if (validSubjects && !validSubjects.includes(subjectId)) {
      subjectId = undefined;
    }
  }

  return { documentType, topic, schoolYear, subjectId };
}

/**
 * The topic without the parts the parser already turned into fields — the
 * document type ("plano de aula sobre"), the year ("para o 5.º ano") and an
 * explicitly named subject ("de Matemática") — so the Tema field doesn't repeat
 * what the form already shows. It only strips what reads as a request, never
 * part of the topic: "Plano inclinado", "Teste de hipóteses" and "A história de
 * Portugal" stay whole. Falls back to the original text when nothing would be left.
 */
export function stripParsedTokens(
  text: string,
  parse: QuickCreateParse,
  countryCode: CountryCode = DEFAULT_COUNTRY_CODE,
): string {
  // Normalize char by char so indices in `norm` match indices in `text`.
  const norm = Array.from(text, (ch) => normalize(ch).charAt(0) || " ").join("");
  const config = matchConfigFor(countryCode);
  const patterns: RegExp[] = [];
  // Every term that names the chosen subject: its label and, for Brazil, its synonyms.
  const subjectTerms = parse.subjectId
    ? config.subjectTerms.filter((entry) => entry.subjectId === parse.subjectId).map((entry) => entry.term)
    : [];
  const subjectLabel = subjectTerms.length > 0
    ? `(?:${subjectTerms.map(escapeRegExp).join("|")})`
    : null;
  const yearPhrase = config.yearPhrase;

  for (const { type, keywords } of config.typeKeywords) {
    if (type !== parse.documentType) continue;
    for (const keyword of [...keywords].sort((a, b) => b.length - a.length)) {
      const word = String.raw`^\s*${escapeRegExp(keyword)}(?:e?s)?(?![a-z0-9])`;
      if (keyword.includes(" ")) {
        // "plano de aula", "ficha de trabalho": unambiguous at the start.
        patterns.push(new RegExp(String.raw`${word}(?:\s+(?:sobre|acerca\s+de|de|do|da|para))?`));
      } else {
        // "plano", "teste", "ficha": only when what follows makes it a request
        // ("Teste sobre…", "Teste de Matemática", "Quiz: …", or nothing at all).
        const requestFollows = [
          String.raw`\s*[:·–-]`,
          String.raw`\s*$`,
          String.raw`\s+(?:sobre|acerca\s+de|para)\b`,
          String.raw`\s+${yearPhrase}`,
          ...(subjectLabel ? [String.raw`\s+(?:de|da|do)\s+${subjectLabel}(?![a-z0-9])`] : []),
        ].join("|");
        patterns.push(
          new RegExp(String.raw`${word}(?=${requestFollows})(?:\s+(?:sobre|acerca\s+de|para))?`),
        );
      }
    }
  }
  if (parse.schoolYear) {
    patterns.push(new RegExp(String.raw`\b${yearPhrase}`));
  }
  if (subjectLabel) {
    // The subject as a field ("de Matemática", "frações matemática"), not as a
    // word in the topic ("A história de Portugal").
    patterns.push(
      new RegExp(
        String.raw`(?:\b(?:de|da|do|em)\s+${subjectLabel}(?![a-z0-9])|(?<![a-z0-9])${subjectLabel}(?=\s*(?:$|[,.;:·–-]|\s${yearPhrase})))`,
      ),
    );
  }

  const removed = Array.from(text, () => false);
  for (const pattern of patterns) {
    const match = pattern.exec(norm);
    if (!match) continue;
    for (let i = match.index; i < match.index + match[0].length; i++) removed[i] = true;
  }

  const result = Array.from(text)
    .filter((_, i) => !removed[i])
    .join("")
    .replace(/\s+/g, " ")
    // A removed year between separators leaves "grau · , com": keep only the last one.
    // Spaced runs only, so an ellipsis or "1–4" inside the topic stays.
    .replace(/\s*[,.:;·–-](?:\s+[,.:;·–-])+/g, (run) => run.trim().slice(-1))
    // "grau , com" when "para o 7.º ano" sat just before the comma.
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,.:;·–-]+|[\s,.:;·–-]+$/g, "")
    // A connector left at the start once its keyword is gone ("sobre frações").
    .replace(/^(?:sobre|acerca\s+de|de|do|da|para)\s+/i, "")
    .trim();
  return result || text.trim();
}

/** Build the creation-page URL with prefill query params */
export function buildQuickCreateUrl(
  parse: QuickCreateParse,
  countryCode: CountryCode = DEFAULT_COUNTRY_CODE,
): string {
  const params = new URLSearchParams();
  params.set("topic", stripParsedTokens(parse.topic, parse, countryCode));
  if (parse.schoolYear) params.set("year", String(parse.schoolYear));
  if (parse.subjectId) params.set("subject", parse.subjectId);
  return `${CREATION_ROUTES[parse.documentType]}?${params.toString()}`;
}
