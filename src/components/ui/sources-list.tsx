"use client";

import type { RagSource } from "@/shared/types/document";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface SourcesListProps {
  sources: RagSource[];
  title?: string;
}

interface DocumentGroup {
  documentName: string;
  url?: string;
  chunks: RagSource[];
}

function ChunkRow({
  chunk,
  isExpanded,
  onToggle,
}: {
  chunk: RagSource;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-md overflow-hidden bg-muted/30 hover:bg-muted/60 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-2.5 py-2 flex items-center gap-2 text-left"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary/60" />
        <p className="flex-1 min-w-0 truncate text-sm font-medium text-foreground leading-tight">
          {chunk.topicLeaf}
        </p>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && chunk.chunkContent && (
        <div className="px-3 pb-3 pt-2 border-t border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {chunk.chunkContent}
          </p>
        </div>
      )}
    </div>
  );
}

function DocumentGroupCard({
  group,
  expandedKey,
  onChunkToggle,
}: {
  group: DocumentGroup;
  expandedKey: string | null;
  onChunkToggle: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 overflow-hidden">
      {/* Document header (acts as accordion trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-2.5 p-3 bg-muted/40 text-left hover:bg-muted/60 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {group.url ? (
            <a
              href={group.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-primary hover:underline break-words"
            >
              {group.documentName}
              <ExternalLink className="ml-1 inline-block w-3 h-3 align-[-2px]" />
            </a>
          ) : (
            <p className="text-sm font-semibold text-foreground break-words">
              {group.documentName}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {group.chunks.length}{" "}
            {group.chunks.length === 1
              ? "segmento consultado"
              : "segmentos consultados"}
          </p>
        </div>
        <div className="shrink-0 self-center text-muted-foreground">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Chunks */}
      {isOpen && (
        <div className="p-2 space-y-1 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-150">
          {group.chunks.map((chunk) => {
            const key = chunk.chunkId ?? `${group.documentName}-${chunk.topicLeaf}`;
            return (
              <ChunkRow
                key={key}
                chunk={chunk}
                isExpanded={expandedKey === key}
                onToggle={() => onChunkToggle(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SourcesList({
  sources,
  title = "Fontes Curriculares Consultadas",
}: SourcesListProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Dedupe by chunkId (keep first), then group by documentName preserving first-seen order.
  const { groups, totalChunks } = useMemo(() => {
    const seenChunkIds = new Set<string>();
    const groupMap = new Map<string, DocumentGroup>();

    for (const s of sources) {
      if (s.chunkId && seenChunkIds.has(s.chunkId)) continue;
      if (s.chunkId) seenChunkIds.add(s.chunkId);

      const key = s.documentName?.trim() || "Documento";
      let group = groupMap.get(key);
      if (!group) {
        group = { documentName: key, url: s.url, chunks: [] };
        groupMap.set(key, group);
      } else if (!group.url && s.url) {
        // Adopt the first URL we see for this document.
        group.url = s.url;
      }
      group.chunks.push(s);
    }

    const arr = Array.from(groupMap.values());
    const total = arr.reduce((sum, g) => sum + g.chunks.length, 0);
    return { groups: arr, totalChunks: total };
  }, [sources]);

  if (totalChunks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Nenhuma fonte consultada
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          As fontes curriculares aparecerão aqui após gerar conteúdo
        </p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-transparent h-full flex flex-col min-h-0">
      <CardHeader className="px-0 pt-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <CardTitle className="text-base font-semibold text-foreground leading-tight">
            {title}
          </CardTitle>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {groups.length} {groups.length === 1 ? "documento" : "documentos"}
          {" · "}
          {totalChunks} {totalChunks === 1 ? "segmento" : "segmentos"}
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
        {groups.map((group) => (
          <DocumentGroupCard
            key={group.documentName}
            group={group}
            expandedKey={expandedKey}
            onChunkToggle={(key) =>
              setExpandedKey((prev) => (prev === key ? null : key))
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
