/**
 * Admin Moderation Page
 * Interface for reviewing and moderating submitted community resources
 */

"use client";

import { ModerationQueue } from "@/components/community/ModerationQueue";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function ModerationPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
                <Shield className="w-8 h-8" />
                Moderação da Comunidade
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Revise recursos submetidos para assegurar qualidade e alinhamento curricular
              </p>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Critérios de Moderação</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ Alinhamento com Aprendizagens Essenciais portuguesas</li>
            <li>✅ Linguagem adequada ao ano de escolaridade</li>
            <li>✅ Conteúdo pedagogicamente correto e completo</li>
            <li>✅ Contexto cultural apropriado para salas portuguesas</li>
            <li>❌ Conteúdo inadequado ou incorreto</li>
            <li>❌ Materiais genéricos não adaptados ao contexto português</li>
          </ul>
        </div>

        {/* Moderation Queue */}
        <ModerationQueue />
      </div>
    </div>
  );
}