/**
 * Admin Moderation Page
 * Interface for reviewing and moderating submitted community resources
 */

"use client";

import { ModerationQueue } from "@/components/community/ModerationQueue";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function ModerationPage() {
  return (
    <PageContainer size="7xl" contentClassName="py-4 sm:py-6">
      <PageHeader
        title="Moderação da Comunidade"
        description="Revise recursos submetidos para assegurar qualidade e alinhamento curricular"
        icon={<Shield className="h-6 w-6 text-primary sm:h-8 sm:w-8" />}
        actions={
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Admin
            </Button>
          </Link>
        }
      />

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <h3 className="mb-2 font-semibold text-blue-800 dark:text-blue-300">📋 Critérios de Moderação</h3>
        <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300/90">
          <li>✅ Alinhamento com Aprendizagens Essenciais portuguesas</li>
          <li>✅ Linguagem adequada ao ano de escolaridade</li>
          <li>✅ Conteúdo pedagogicamente correto e completo</li>
          <li>✅ Contexto cultural apropriado para salas portuguesas</li>
          <li>❌ Conteúdo inadequado ou incorreto</li>
          <li>❌ Materiais genéricos não adaptados ao contexto português</li>
        </ul>
      </div>

      <ModerationQueue />
    </PageContainer>
  );
}
