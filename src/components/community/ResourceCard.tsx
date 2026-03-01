/**
 * Resource Card Component
 * Displays shared resource with metadata and social proof for Community Library
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SharedResource } from "@/services/api/community.service";
import { Eye, RotateCcw, Star } from "lucide-react";

interface ResourceCardProps {
  resource: SharedResource;
  onReuse?: (resourceId: string) => void;
  onPreview?: (resourceId: string) => void;
  isReusing?: boolean;
  className?: string;
}

export function ResourceCard({ 
  resource, 
  onReuse, 
  onPreview, 
  isReusing = false,
  className = "" 
}: ResourceCardProps) {


  const handleReuse = () => {
    onReuse?.(resource.id);
  };

  const handlePreview = () => {
    onPreview?.(resource.id);
  };

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${className}`}>
      {/* Header with title and founding contributor badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg text-foreground leading-tight flex-1">
          {resource.title}
        </h3>
        {resource.isFoundingContributor && (
          <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
            <Star className="w-3 h-3 mr-1" />
            Membro Fundador
          </Badge>
        )}
      </div>

      {/* Description */}
      {resource.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {resource.description}
        </p>
      )}

      {/* Curriculum Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">
          {resource.grade}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {resource.subject}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {resource.resourceType}
        </Badge>
      </div>

      {/* Contributor & Social Proof */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>Por {resource.contributorName}</span>
        <span className="font-medium">
          {resource.reuseCount} professores reutilizaram
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-2" />
          Pré-visualizar
        </Button>
        <Button
          onClick={handleReuse}
          disabled={isReusing}
          size="sm"
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {isReusing ? "Reutilizando..." : "Reutilizar"}
        </Button>
      </div>
    </Card>
  );
}