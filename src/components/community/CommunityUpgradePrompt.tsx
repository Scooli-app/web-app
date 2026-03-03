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
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4 flex items-center justify-center gap-3">
            <Users className="w-8 h-8" />
            Biblioteca Comunitária
          </h1>
          <p className="text-lg text-muted-foreground">
            Partilhe e descubra recursos educacionais criados pela comunidade
          </p>
        </div>

        {/* Feature Preview - Disabled */}
        <div className="relative mb-8">
          {/* Overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <Lock className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Funcionalidade Pro</h2>
              <p className="text-muted-foreground mb-6">
                Aceda à Biblioteca Comunitária com uma subscrição Pro
              </p>
              <Button onClick={onUpgrade} size="lg" className="w-full">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
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

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-center">
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
          <Button onClick={onUpgrade} size="lg" className="px-8 py-4 text-lg">
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

