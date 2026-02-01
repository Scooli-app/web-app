"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Routes } from "@/shared/types";
import { AlertCircle, ArrowRight, Crown, Infinity, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanModal({
  open,
  onOpenChange,
}: UpgradePlanModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push(Routes.CHECKOUT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="pt-8 pb-6 px-8 text-center bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-900/10">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground mb-1">
            Limite do Plano Grátis Atingido
          </DialogTitle>
          
          <DialogDescription className="text-muted-foreground">
            Chegou ao limite de gerações do seu plano gratuito.
          </DialogDescription>
        </div>

        {/* Benefits List */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Desbloqueie o Pro para continuar
          </p>
          
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Infinity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Gerações Ilimitadas</p>
              <p className="text-xs text-muted-foreground">Nunca pare de criar conteúdos</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Personalização Avançada</p>
              <p className="text-xs text-muted-foreground">Aceda a todos os modelos e templates</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Funcionalidades Premium</p>
              <p className="text-xs text-muted-foreground">Exportação e ferramentas exclusivas</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-12 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            Ver Planos de Upgrade
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Talvez mais tarde
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
