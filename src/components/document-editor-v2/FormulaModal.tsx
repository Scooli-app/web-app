"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import katex from "katex";
import { Sigma } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (tex: string) => void;
  /** When set, the modal opens in edit mode seeded with this LaTeX. */
  initialTex?: string;
}

interface SymbolGroup {
  title: string;
  items: Array<{
    label: string;
    insert: string;
  }>;
}

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    title: "Frações, potências e índices",
    items: [
      { label: "a^2", insert: "a^2" },
      { label: "a_x", insert: "a_x" },
      { label: "a/b", insert: "a/b" },
      { label: "\\frac{a}{b}", insert: "\\frac{a}{b}" },
    ],
  },
  {
    title: "Raízes",
    items: [
      { label: "\\sqrt{x}", insert: "\\sqrt{x}" },
      { label: "\\sqrt[3]{x}", insert: "\\sqrt[3]{x}" },
    ],
  },
  {
    title: "Trig e logs",
    items: [
      { label: "\\sin(x)", insert: "\\sin(x)" },
      { label: "\\cos(x)", insert: "\\cos(x)" },
      { label: "\\tan(x)", insert: "\\tan(x)" },
      { label: "\\sin^{-1}(x)", insert: "\\sin^{-1}(x)" },
      { label: "\\log(x)", insert: "\\log(x)" },
      { label: "\\ln(x)", insert: "\\ln(x)" },
      { label: "e^x", insert: "e^x" },
    ],
  },
  {
    title: "Operadores grandes",
    items: [
      { label: "\\sum_{i=1}^{n}", insert: "\\sum_{i=1}^{n}" },
      { label: "\\lim_{x \\to a}", insert: "\\lim_{x \\to a}" },
      { label: "\\int_a^b", insert: "\\int_a^b" },
    ],
  },
  {
    title: "Barras e vetores",
    items: [
      { label: "\\bar{x}", insert: "\\bar{x}" },
      { label: "\\hat{x}", insert: "\\hat{x}" },
      { label: "\\vec{XA}", insert: "\\vec{XA}" },
    ],
  },
  {
    title: "Relações",
    items: [
      { label: "=", insert: "=" },
      { label: "\\neq", insert: "\\neq" },
      { label: "\\approx", insert: "\\approx" },
      { label: "<", insert: "<" },
      { label: ">", insert: ">" },
      { label: "\\le", insert: "\\le" },
      { label: "\\ge", insert: "\\ge" },
      { label: "\\to", insert: "\\to" },
      { label: "\\Rightarrow", insert: "\\Rightarrow" },
      { label: "\\Leftrightarrow", insert: "\\Leftrightarrow" },
    ],
  },
  {
    title: "Operadores",
    items: [
      { label: "+", insert: "+" },
      { label: "-", insert: "-" },
      { label: "\\pm", insert: "\\pm" },
      { label: "\\times", insert: "\\times" },
      { label: "\\div", insert: "\\div" },
      { label: "\\cdot", insert: "\\cdot" },
    ],
  },
  {
    title: "Grego",
    items: [
      { label: "\\pi", insert: "\\pi" },
      { label: "\\alpha", insert: "\\alpha" },
      { label: "\\beta", insert: "\\beta" },
      { label: "\\theta", insert: "\\theta" },
      { label: "\\lambda", insert: "\\lambda" },
      { label: "\\mu", insert: "\\mu" },
      { label: "\\omega", insert: "\\omega" },
      { label: "\\Delta", insert: "\\Delta" },
      { label: "\\phi", insert: "\\phi" },
      { label: "\\sigma", insert: "\\sigma" },
    ],
  },
  {
    title: "Conjuntos e lógica",
    items: [
      { label: "\\in", insert: "\\in" },
      { label: "\\notin", insert: "\\notin" },
      { label: "\\subset", insert: "\\subset" },
      { label: "\\cup", insert: "\\cup" },
      { label: "\\cap", insert: "\\cap" },
      { label: "\\forall", insert: "\\forall" },
      { label: "\\exists", insert: "\\exists" },
      { label: "\\emptyset", insert: "\\emptyset" },
      { label: "\\infty", insert: "\\infty" },
      { label: "\\wedge", insert: "\\wedge" },
      { label: "\\vee", insert: "\\vee" },
    ],
  },
  {
    title: "Conjuntos numéricos",
    items: [
      { label: "\\mathbb{N}", insert: "\\mathbb{N}" },
      { label: "\\mathbb{Z}", insert: "\\mathbb{Z}" },
      { label: "\\mathbb{Q}", insert: "\\mathbb{Q}" },
      { label: "\\mathbb{R}", insert: "\\mathbb{R}" },
      { label: "\\mathbb{C}", insert: "\\mathbb{C}" },
    ],
  },
];

function renderKatexHtml(tex: string, displayMode = false) {
  return katex.renderToString(tex || "\\placeholder{}", {
    displayMode,
    throwOnError: false,
    strict: "ignore",
  });
}

function toLatex(raw: string, latexMode: boolean) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (latexMode) return trimmed;

  return trimmed
    .replace(/π/g, "\\pi ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ")
    .replace(/θ/g, "\\theta ")
    .replace(/λ/g, "\\lambda ")
    .replace(/μ/g, "\\mu ")
    .replace(/ω/g, "\\omega ")
    .replace(/Δ/g, "\\Delta ")
    .replace(/φ/g, "\\phi ")
    .replace(/σ/g, "\\sigma ")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/±/g, "\\pm ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\neq ")
    .replace(/≈/g, "\\approx ")
    .replace(/→/g, "\\to ")
    .replace(/⇒/g, "\\Rightarrow ")
    .replace(/⇔/g, "\\Leftrightarrow ")
    .replace(/∞/g, "\\infty ")
    .replace(/∈/g, "\\in ")
    .replace(/∉/g, "\\notin ")
    .replace(/⊂/g, "\\subset ")
    .replace(/∪/g, "\\cup ")
    .replace(/∩/g, "\\cap ")
    .replace(/∀/g, "\\forall ")
    .replace(/∃/g, "\\exists ")
    .replace(/∅/g, "\\emptyset ")
    .replace(/∧/g, "\\wedge ")
    .replace(/∨/g, "\\vee ")
    .replace(/(?<!\\)\bsin\b/g, "\\sin")
    .replace(/(?<!\\)\bcos\b/g, "\\cos")
    .replace(/(?<!\\)\btan\b/g, "\\tan")
    .replace(/(?<!\\)\blog\b/g, "\\log")
    .replace(/(?<!\\)\bln\b/g, "\\ln")
    .replace(/(?<!\\)\blim\b/g, "\\lim")
    .replace(/√/g, "\\sqrt");
}

export function FormulaModal({ open, onClose, onInsert, initialTex }: Props) {
  const isEditing = typeof initialTex === "string" && initialTex.trim().length > 0;
  const [latexMode, setLatexMode] = useState(true);
  const [value, setValue] = useState("\\frac{a}{b}");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Seed the field each time the modal opens: existing LaTeX when editing,
  // a sensible default when inserting a new formula.
  useEffect(() => {
    if (open) {
      setLatexMode(true);
      setValue(isEditing ? initialTex!.trim() : "\\frac{a}{b}");
    }
  }, [open, isEditing, initialTex]);

  const previewTex = useMemo(() => toLatex(value, latexMode), [value, latexMode]);

  const insertAtCursor = (snippet: string) => {
    const input = inputRef.current;
    if (!input) {
      setValue((prev) => prev + snippet);
      return;
    }

    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    setValue(nextValue);

    requestAnimationFrame(() => {
      input.focus();
      const caret = start + snippet.length;
      input.setSelectionRange(caret, caret);
    });
  };

  const handleInsert = () => {
    const finalTex = previewTex.trim();
    if (!finalTex) return;
    onInsert(finalTex);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sigma className="h-4 w-4 text-primary" />
            {isEditing ? "Editar fórmula" : "Adicionar fórmula"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4 border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Modo LaTeX</p>
                <p className="text-xs text-muted-foreground">
                  Ativa para escrever LaTeX puro. Desativa para entrada mais simples.
                </p>
              </div>
              <Switch checked={latexMode} onCheckedChange={setLatexMode} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Fórmula</label>
              <Textarea
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={latexMode ? "\\frac{a}{b}" : "Ex.: sin(x) + πr^2"}
                className="min-h-[120px] font-mono text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Usa a paleta para inserir símbolos no cursor e confirma quando a pré-visualização estiver correta.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Pré-visualização</p>
              <div
                className="flex min-h-[144px] items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-6 text-foreground"
                dangerouslySetInnerHTML={{ __html: renderKatexHtml(previewTex || "\\,", true) }}
              />
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col">
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm font-medium text-foreground">Paleta de símbolos</p>
              <p className="text-xs text-muted-foreground">
                Cada botão insere LaTeX diretamente no campo acima.
              </p>
            </div>
            <ScrollArea className="h-[520px] px-6 py-4">
              <div className="space-y-5 pr-3">
                {SYMBOL_GROUPS.map((group) => (
                  <section key={group.title} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.items.map((item) => (
                        <button
                          key={`${group.title}-${item.insert}`}
                          type="button"
                          onClick={() => insertAtCursor(item.insert)}
                          className="flex h-12 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
                          title={item.insert}
                          dangerouslySetInnerHTML={{ __html: renderKatexHtml(item.label) }}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleInsert} disabled={!previewTex.trim()}>
            {isEditing ? "Guardar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
