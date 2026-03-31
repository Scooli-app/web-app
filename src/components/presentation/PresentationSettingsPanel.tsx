import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import type {
  PresentationBlock,
  PresentationCalloutBlock,
  PresentationIconName,
  PresentationImageBlock,
  PresentationLayout,
  PresentationRecord,
  PresentationSlide,
  PresentationThemeId,
} from "@/shared/types/presentation";
import { cn } from "@/shared/utils/utils";
import {
  Blocks,
  ImagePlus,
  LayoutTemplate,
  Palette,
  Type,
} from "lucide-react";
import { presentationThemes } from "./presentation-themes";

const layoutOptions: Array<{
  value: PresentationLayout;
  label: string;
  description: string;
}> = [
  {
    value: "cover",
    label: "Capa",
    description: "Impacto forte com título e área visual de apoio.",
  },
  {
    value: "title_bullets",
    label: "Título + bullets",
    description: "Estrutura equilibrada para narrativa e apoio lateral.",
  },
  {
    value: "two_column",
    label: "Duas colunas",
    description: "Comparações, contraste e leitura lado a lado.",
  },
  {
    value: "image_focus",
    label: "Imagem em destaque",
    description: "Hero visual com texto editorial no lado oposto.",
  },
  {
    value: "callout_grid",
    label: "Grade de destaques",
    description: "Bom para resumir ideias e reforçar pontos-chave.",
  },
  {
    value: "quote",
    label: "Citação",
    description: "Slide minimalista para uma mensagem central.",
  },
];

const iconOptions: Array<{ value: PresentationIconName; label: string }> = [
  { value: "sparkles", label: "Sparkles" },
  { value: "book-open", label: "Livro" },
  { value: "graduation-cap", label: "Educação" },
  { value: "lightbulb", label: "Ideia" },
  { value: "target", label: "Objetivo" },
  { value: "globe", label: "Mundo" },
  { value: "users", label: "Equipa" },
  { value: "chart-column", label: "Dados" },
  { value: "brain", label: "Pensamento" },
  { value: "shield-check", label: "Confiança" },
  { value: "clock-3", label: "Tempo" },
  { value: "quote", label: "Citação" },
];

interface PresentationSettingsPanelProps {
  presentation: PresentationRecord;
  activeSlide: PresentationSlide | null;
  selectedBlock: PresentationBlock | null;
  onThemeChange: (themeId: PresentationThemeId) => void;
  onSlideLayoutChange: (layout: PresentationLayout) => void;
  onImageMetaChange: (nextValue: Partial<PresentationImageBlock>) => void;
  onCalloutChange: (nextValue: Partial<PresentationCalloutBlock>) => void;
  onIconChange: (name: PresentationIconName) => void;
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Palette;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-background/75 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-accent p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function PresentationSettingsPanel({
  presentation,
  activeSlide,
  selectedBlock,
  onThemeChange,
  onSlideLayoutChange,
  onImageMetaChange,
  onCalloutChange,
  onIconChange,
}: PresentationSettingsPanelProps) {
  const activeLayout = activeSlide?.layout ?? "title_bullets";
  const activeLayoutMeta =
    layoutOptions.find((option) => option.value === activeLayout) ??
    layoutOptions[1];

  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <Section
        title="Tema"
        description="Temas reais mudam ritmo visual, tipografia e tratamento dos blocos."
        icon={Palette}
      >
        <div className="grid gap-3">
          {presentationThemes.map((theme) => {
            const isActive = theme.id === presentation.themeId;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onThemeChange(theme.id)}
                className={cn(
                  "rounded-[20px] border p-3 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/70 hover:border-primary/40 hover:bg-accent/30",
                )}
              >
                <div
                  className="h-14 rounded-2xl border border-white/20"
                  style={{ background: theme.preview }}
                />
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {theme.name}
                    </span>
                    {isActive ? <Badge>Ativo</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Layout do slide"
        description="Ajusta a composição sem abandonar a edição visual no canvas."
        icon={LayoutTemplate}
      >
        <div className="space-y-2">
          <Select
            value={activeLayout}
            onValueChange={(value) =>
              onSlideLayoutChange(value as PresentationLayout)
            }
            disabled={!activeSlide}
          >
            <SelectTrigger className="h-11 rounded-xl bg-card">
              <SelectValue placeholder="Escolher layout" />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            {activeLayoutMeta.description}
          </p>
        </div>
      </Section>

      <Section
        title="Bloco selecionado"
        description="Usa o canvas para editar conteúdo. Aqui ficam apenas propriedades estruturais."
        icon={Blocks}
      >
        {selectedBlock ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedBlock.type}</Badge>
              <Badge variant="outline">{selectedBlock.slot}</Badge>
            </div>

            {(selectedBlock.type === "title" ||
              selectedBlock.type === "subtitle" ||
              selectedBlock.type === "paragraph" ||
              selectedBlock.type === "bullets") && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Type className="h-4 w-4 text-primary" />
                  Conteúdo em edição direta
                </div>
                Clica no bloco dentro do slide para editar o texto exatamente onde
                ele aparece na apresentação final.
              </div>
            )}

            {selectedBlock.type === "callout" && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Tom do destaque
                </label>
                <Select
                  value={selectedBlock.tone}
                  onValueChange={(value) =>
                    onCalloutChange({
                      tone: value as PresentationCalloutBlock["tone"],
                    })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-card">
                    <SelectValue placeholder="Escolher tom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutro</SelectItem>
                    <SelectItem value="info">Informativo</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Atenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedBlock.type === "icon" && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Ícone
                </label>
                <Select
                  value={selectedBlock.name}
                  onValueChange={(value) =>
                    onIconChange(value as PresentationIconName)
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-card">
                    <SelectValue placeholder="Escolher ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedBlock.type === "image" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <ImagePlus className="h-4 w-4 text-primary" />
                    Upload no próprio slide
                  </div>
                  Carrega ou substitui a imagem no canvas e usa este painel para
                  refinar descrição e intenção visual.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Texto alternativo
                  </label>
                  <Input
                    value={selectedBlock.alt}
                    onChange={(event) =>
                      onImageMetaChange({ alt: event.target.value })
                    }
                    className="h-11 rounded-xl bg-card"
                    placeholder="Descreve o conteúdo visual"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Legenda
                  </label>
                  <Textarea
                    value={selectedBlock.caption}
                    onChange={(event) =>
                      onImageMetaChange({ caption: event.target.value })
                    }
                    className="rounded-xl bg-card"
                    placeholder="Contexto curto para a imagem"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Prompt visual
                  </label>
                  <Textarea
                    value={selectedBlock.imagePrompt}
                    onChange={(event) =>
                      onImageMetaChange({ imagePrompt: event.target.value })
                    }
                    className="rounded-xl bg-card"
                    placeholder="Referência visual ou intenção narrativa"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
            Seleciona um bloco no slide para ajustar propriedades visuais como
            tema, tom de callout, imagem ou ícone.
          </div>
        )}
      </Section>
    </aside>
  );
}
