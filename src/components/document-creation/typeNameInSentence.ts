/**
 * A document type's name after a verb ("Criar ficha de trabalho"). pt-PT is sentence case, so the
 * name loses its capital; English keeps its Title Case name ("Create Lesson Plan").
 */
export function typeNameInSentence(typeName: string, locale: string): string {
  return locale.startsWith("pt") ? typeName.charAt(0).toLocaleLowerCase(locale) + typeName.slice(1) : typeName;
}
