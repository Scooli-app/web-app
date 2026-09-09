"use client";

import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppDispatch } from "@/store/hooks";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";

interface FeatureUnavailableProps {
  /** Short feature name for the heading, e.g. "As Planificações". */
  title: string;
  /** One line explaining what the feature does. */
  description?: string;
}

/**
 * Shown in place of a page whose feature flag is off. Replaces the previous
 * behaviour of silently redirecting the user to the dashboard with no
 * explanation — a gated teacher now sees why and how to get access.
 */
export function FeatureUnavailable({ title, description }: FeatureUnavailableProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-xl font-semibold">{title} — funcionalidade Pro</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {description ??
            "Esta funcionalidade está disponível nos planos pagos. Atualiza o teu plano para começar a usá-la."}
        </p>
        <Button
          size="lg"
          className="w-full"
          onClick={() => dispatch(setUpgradeModalOpen(true))}
        >
          <Zap className="mr-2 h-4 w-4" />
          Atualizar plano
        </Button>
      </Card>
    </div>
  );
}
