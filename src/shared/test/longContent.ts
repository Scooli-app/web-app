// Edge-case content for source lists: the longest name the API takes, written with no spaces, accents and emoji.
const CHUNK = "Critérios_de_avaliação_📚_Matemática_";
export const LONG_NAME = CHUNK.repeat(Math.ceil(200 / CHUNK.length)).slice(0, 200);
export const ALL_YEARS = Array.from({ length: 12 }, (_, i) => i + 1);
