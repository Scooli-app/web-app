"use client";

import { reviewFeedService } from "@/services/api/review-feed.service";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import type { TurmaReviewCount } from "@/shared/types/review-feed";
import { ReviewFeedChipsView } from "./ReviewFeedChipsView";
import { useEffect, useState } from "react";

/** The dashboard's "{n} por rever" chip per turma, linking to the turma's section. Nothing when none wait. */
export function ReviewFeedChips() {
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const [turmas, setTurmas] = useState<TurmaReviewCount[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    reviewFeedService
      .summary()
      .then((response) => {
        if (active) setTurmas(response);
      })
      .catch(() => {
        if (active) setTurmas([]);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled) return null;
  return <ReviewFeedChipsView turmas={turmas} />;
}
