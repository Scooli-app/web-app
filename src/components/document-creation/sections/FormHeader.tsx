import { useLocale, useTranslations } from "next-intl";
import { typeNameInSentence } from "../typeNameInSentence";
import type { DocumentTypeConfig } from "../types";

interface FormHeaderProps {
  documentType: DocumentTypeConfig;
}

/** A tool's title, not a landing hero: left-aligned, so the first field sits right under it. */
export function FormHeader({ documentType }: FormHeaderProps) {
  const t = useTranslations("documentCreation");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const typeName = tEnums(`documentType.${documentType.id}`);
  const midSentence = typeNameInSentence(typeName, locale);

  return (
    <div className="mb-3">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        {t("createPrefix")} {midSentence}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t(`types.${documentType.id}.description`)}</p>
    </div>
  );
}
