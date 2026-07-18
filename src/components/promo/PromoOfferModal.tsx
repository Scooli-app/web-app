"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Routes } from "@/shared/types";
import { PROMO_PLAN_CODES } from "@/shared/utils/promo";
import { ArrowRight, PartyPopper, Sparkles, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

interface PromoOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoOfferModal({ open, onOpenChange }: PromoOfferModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      posthog.capture("promo_offer_modal_viewed");
    }
  }, [open]);

  const goToCheckout = (planCode: string) => {
    posthog.capture("promo_offer_modal_cta_clicked", { plan_code: planCode });
    onOpenChange(false);
    router.push(`${Routes.CHECKOUT}?plan=${planCode}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-y-auto">
        <div className="bg-gradient-to-b from-primary/10 to-transparent px-8 pb-6 pt-8 pr-16 text-center">
          <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <PartyPopper className="w-7 h-7 text-primary" />
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground mb-1">
            Oferta de lançamento
          </DialogTitle>

          <DialogDescription className="text-muted-foreground">
            Scooli Pro por apenas 2,99€/mês nos primeiros 30 dias - e fica com
            este preço para sempre.
          </DialogDescription>
        </div>

        <div className="space-y-3 p-6 pr-14">
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Gerações ilimitadas
              </p>
              <p className="text-xs text-muted-foreground">
                Acesso a todas as funcionalidades Pro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Preço bloqueado para sempre
              </p>
              <p className="text-xs text-muted-foreground">
                Sem aumentos depois da promoção terminar
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 pr-14">
          <Button
            onClick={() => goToCheckout(PROMO_PLAN_CODES.monthly)}
            className="w-full h-12 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            Ativar por 2,99€/mês
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
            onClick={() => goToCheckout(PROMO_PLAN_CODES.annual)}
            className="w-full mt-3 text-sm text-primary hover:text-primary/80 transition-colors py-1 font-medium"
          >
            Prefiro o anual por 28,70€
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Talvez mais tarde
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
