"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** "Voltar" for admin page headers; goes to the admin console unless told otherwise. */
export function AdminBackButton({ href = "/admin" }: { href?: string }) {
  const router = useRouter();
  return (
    <Button variant="outline" size="sm" onClick={() => router.push(href)}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  );
}
