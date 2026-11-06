"use client";

import { TrialActivationView } from "@/components/billing/TrialActivationView";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TrialActivationContent() {
  const token = useSearchParams().get("token");
  return <TrialActivationView token={token} />;
}

/** `/trial/activate?token=…`: the Pro trial campaign email's link (ENG-320). */
export default function TrialActivatePage() {
  return (
    <Suspense fallback={null}>
      <TrialActivationContent />
    </Suspense>
  );
}
