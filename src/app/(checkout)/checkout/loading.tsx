import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function CheckoutLoading() {
  const t = await getTranslations("checkout");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{t("loading.checkoutPage")}</p>
    </div>
  );
}

