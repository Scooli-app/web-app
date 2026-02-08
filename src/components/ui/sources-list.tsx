"use client";

import type { RagSource } from "@/shared/types/document";
import { cn } from "@/shared/utils/utils";
import { BookOpen, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface SourcesListProps {
  sources: RagSource[];
  title?: string;
}

function SourceCard({
  source,
  isExpanded,
  onToggle,
}: {
  source: RagSource;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Format similarity as percentage
  const relevancePercent = Math.round(source.similarity * 100);
  
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-background/50 transition-all hover:border-primary/30">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {source.documentName}
            </span>
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap cursor-help",
                    relevancePercent >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    relevancePercent >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {relevancePercent}%
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  <p>Relevância com o pedido</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <p className="text-sm font-medium text-foreground leading-tight">
            {source.topicLeaf}
          </p>
        </div>
        
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && source.chunkContent && (
        <div className="px-4 pb-3 pt-3 border-t border-border/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {source.chunkContent}
          </p>
        </div>
      )}
    </div>
  );
}

export function SourcesList({
  sources,
  title = "Fontes Curriculares Consultadas",
}: SourcesListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (sources.length === 0) {
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

  // Remove duplicates by chunkId
  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex((s) => s.chunkId === source.chunkId)
  );

  // Sort by similarity (most relevant first)
  const sortedSources = [...uniqueSources].sort(
    (a, b) => b.similarity - a.similarity
  );

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {title}
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {sortedSources.length} fonte{sortedSources.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-2">
        {sortedSources.map((source, index) => (
          <SourceCard
            key={source.chunkId || index}
            source={source}
            isExpanded={expandedIndex === index}
            onToggle={() =>
              setExpandedIndex(expandedIndex === index ? null : index)
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
