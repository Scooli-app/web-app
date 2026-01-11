import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Star, Upload, Users } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Comunidade Scooli
          </h1>
          <p className="text-lg text-muted-foreground">
            Partilhe e descubra recursos educacionais criados pela comunidade
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">1,247</h3>
            <p className="text-sm text-muted-foreground">Membros Ativos</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">3,891</h3>
            <p className="text-sm text-muted-foreground">Recursos Partilhados</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Download className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">12,456</h3>
            <p className="text-sm text-muted-foreground">Downloads Totais</p>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="p-8 text-center">
          <div className="mb-6">
            <Star className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Biblioteca Comunitária
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Em breve poderá partilhar e descobrir recursos educacionais
              criados por outros professores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                ✨ Funcionalidades
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Partilhar planos de aula</li>
                <li>• Avaliar recursos de outros</li>
                <li>• Ganhar pontos de impacto</li>
                <li>• Sistema de badges</li>
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                🎯 Benefícios
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Economizar tempo</li>
                <li>• Inspiração para aulas</li>
                <li>• Rede de professores</li>
                <li>• Reconhecimento da comunidade</li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3">
              <Users className="h-5 w-5 mr-2" />
              Ser Notificado
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
