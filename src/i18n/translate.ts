/**
 * Translation for code that runs outside React — Redux thunks, API services,
 * plain helpers — where `useTranslations` cannot be called.
 *
 * It reuses the translator of the `NextIntlClientProvider` in the root layout
 * rather than importing the catalogues again: `<TranslatorBridge />` registers
 * it on every render, so it always follows the interface locale the teacher is
 * currently seeing and costs nothing extra in the bundle.
 *
 * Keys are full paths from the catalogue root (`"errors.timetable.load"`), not
 * relative to a namespace.
 *
 * Only call it when the text is produced, never at module load: a constant
 * computed at import time would freeze whichever locale was active then (or the
 * raw key, before the bridge has mounted).
 */

export type TranslationValues = Record<string, string | number | Date>;
type Translator = (key: string, values?: TranslationValues) => string;

let current: Translator | null = null;

/** Called by `TranslatorBridge`; not meant for anything else. */
export function registerTranslator(translator: Translator): void {
  current = translator;
}

export function translate(key: string, values?: TranslationValues): string {
  if (!current) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`translate("${key}") called before TranslatorBridge mounted`);
    }
    return key;
  }
  return current(key, values);
}
