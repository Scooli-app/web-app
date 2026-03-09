/**
 * Community Upgrade Prompt Component
 * Displays preview of Community Library for Free users with upgrade prompts
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Star, Users, Zap } from "lucide-react";

interface CommunityUpgradePromptProps {
  onUpgrade: () => void;
}

export function CommunityUpgradePrompt({ onUpgrade }: CommunityUpgradePromptProps) {
  return (
    <div className="w-full min-h-dvh bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-3 flex items-center justify-center gap-2 text-2xl font-bold text-primary sm:mb-4 sm:gap-3 sm:text-4xl">
            <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            Biblioteca Comunitária
          </h1>
          <p className="text-sm text-muted-foreground sm:text-lg">
            Partilhe e descubra recursos educacionais criados pela comunidade
          </p>
        </div>

        {/* Feature Preview - Disabled */}
        <div className="relative mb-8">
          {/* Overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <Card className="max-w-md p-6 text-center sm:p-8">
              <Lock className="mx-auto mb-4 h-12 w-12 text-primary sm:h-16 sm:w-16" />
              <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Funcionalidade Pro</h2>
              <p className="text-muted-foreground mb-6">
                Aceda à Biblioteca Comunitária com uma subscrição Pro
              </p>
              <Button onClick={onUpgrade} size="lg" className="w-full text-sm sm:text-base">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade para Pro
              </Button>
            </Card>
          </div>

          {/* Preview Content (Blurred) */}
          <div className="opacity-50">
            {/* Mock Filters */}
            <Card className="p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-16" />
                  <div className="h-10 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-10 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </div>
            </Card>

            {/* Mock Resource Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    {/* Title */}
                    <div className="h-6 bg-muted rounded w-3/4" />
                    
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                    
                    {/* Tags */}
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="h-6 w-16 bg-muted" />
                      <Badge variant="secondary" className="h-6 w-20 bg-muted" />
                    </div>
                    
                    {/* Stats */}
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-4 bg-muted rounded w-32" />
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded flex-1" />
                      <div className="h-8 bg-muted rounded flex-1" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 md:gap-8">
          <Card className="p-4 sm:p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold sm:mb-4 sm:text-xl">
              <Star className="w-6 h-6 text-amber-500" />
              Para Professores que Reutilizam
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>✅ Pesquisa por ano, disciplina e tipo de recurso</li>
              <li>✅ Recursos alinhados com Aprendizagens Essenciais</li>
              <li>✅ Reutilização instantânea com adaptação por IA</li>
              <li>✅ Validação por pares (contadores de reutilização)</li>
              <li>✅ Poupança de tempo: 20 minutos em vez de 60+</li>
            </ul>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold sm:mb-4 sm:text-xl">
              <Users className="w-6 h-6 text-blue-500" />
              Para Professores que Partilham
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>✅ Reconhecimento profissional visível</li>
              <li>✅ Métricas de impacto: quantos reutilizaram</li>
              <li>✅ Dashboard pessoal com estatísticas</li>
              <li>✅ Ajudar outros professores e construir rede</li>
            </ul>
          </Card>
        </div>

        {/* Testimonials Preview */}
        <Card className="mb-8 p-4 sm:p-6">
          <h3 className="mb-4 text-center text-lg font-semibold sm:text-xl">
            Experiências dos Professores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">👩‍🏫</div>
              <h4 className="font-medium mb-2">Mariana, 2º ciclo</h4>
              <p className="text-sm text-muted-foreground italic">
                &quot;Finalmente encontro recursos alinhados com o currículo português. 
                Poupo 2 horas todos os domingos!&quot;
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">👨‍🏫</div>
              <h4 className="font-medium mb-2">Ricardo, 3º ciclo</h4>
              <p className="text-sm text-muted-foreground italic">
                &quot;Ver que 47 professores reutilizaram os meus materiais dá-me 
                reconhecimento profissional real.&quot;
              </p>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Button onClick={onUpgrade} size="lg" className="px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg">
            <Zap className="w-5 h-5 mr-3" />
            Começar com Plano Pro
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Aceda à Biblioteca Comunitária e transforme a sua preparação de aulas
          </p>
        </div>
      </div>
    </div>
  );
}

