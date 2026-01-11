"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Zap, Infinity, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentSuccessModal({
  open,
  onOpenChange,
}: PaymentSuccessModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden" hideCloseButton>
        {/* Confetti animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor:
                    i % 4 === 0
                      ? "#6753FF"
                      : i % 4 === 1
                      ? "#1DB67D"
                      : i % 4 === 2
                      ? "#FFC857"
                      : "#8B7AFF",
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>
        )}

        <style jsx>{`
          @keyframes confetti {
            0% {
              transform: translateY(-10px) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(400px) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti {
            animation: confetti 2s ease-out forwards;
          }
        `}</style>

        {/* Header */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-border">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground mb-1">
            Bem-vindo ao Scooli Pro! 🎉
          </DialogTitle>
          
          <p className="text-muted-foreground">
            A sua subscrição foi ativada com sucesso
          </p>
        </div>

        {/* Features */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            O que desbloqueou
          </p>
          
          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
            <div className="w-11 h-11 bg-emerald-500 dark:bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Infinity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Gerações ilimitadas</p>
              <p className="text-sm text-muted-foreground">Crie sem limites</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Templates personalizados</p>
              <p className="text-sm text-muted-foreground">Crie os seus próprios templates</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
            <div className="w-11 h-11 bg-amber-500 dark:bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Suporte prioritário</p>
              <p className="text-sm text-muted-foreground">Resposta em menos de 24h</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Começar a Criar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
