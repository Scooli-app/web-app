"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function PresentLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

// SCOOL-132 — Lazy load the fullscreen presenter. The architecture page
// commits to Reveal.js as the long-term renderer (presenter view, fragments,
// transitions, print stylesheet). For v1 we ship a lighter custom presenter
// that reuses <SlideRenderer> and handles keyboard nav + fullscreen + PDF
// print; Reveal.js can replace this when the team wants the richer features.
const PresentView = dynamic(
  () =>
    import("@/components/blocks/PresentView").then((m) => m.PresentView),
  { loading: PresentLoading, ssr: false },
);

interface PresentRoutePageProps {
  params: Promise<{ id: string }>;
}

export default function PresentRoutePage({ params }: PresentRoutePageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PresentLoading />}>
      <PresentView documentId={id} />
    </Suspense>
  );
}
