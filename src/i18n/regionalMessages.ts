/**
 * Regional variants: the same language, worded for one country. `pt-BR` is
 * Brazilian Portuguese ("você" instead of "tu", "arquivo" instead of
 * "ficheiro", BNCC instead of the Aprendizagens Essenciais) and holds only the
 * keys it words differently from `pt-PT`, merged over it at request time
 * (`request.ts`, `BASE_LOCALE`). The teacher picks it in the language setting;
 * picking Brazil as the country sets it as the default.
 *
 * The variant is merged over the base catalogue, so a key missing from it
 * falls back to the base text instead of showing a raw key.
 */

type Catalogue = Record<string, unknown>;

function isPlainObject(value: unknown): value is Catalogue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameShape(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b);
  return typeof a === typeof b;
}

/**
 * Deep merge: overlay values replace base values; base keys absent from the
 * overlay stay. Arrays (suggestion lists) are replaced whole, never merged by index.
 */
export function mergeCatalogues<T extends Catalogue>(base: T, overlay: Catalogue): T {
  const out: Catalogue = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      out[key] = mergeCatalogues(current, value);
    } else if (sameShape(value, current)) {
      // Only take a value with the base's shape: a stray object where the base
      // has a string (or the reverse) would break `t()` for that key.
      out[key] = value;
    }
  }
  return out as T;
}
