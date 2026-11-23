import { notFound } from "next/navigation";

// Unknown URLs are rewritten to /{locale}/…; send them to [locale]/not-found.tsx
// so the 404 page renders inside the locale layout, in the teacher's language.
export default function CatchAllNotFound() {
  notFound();
}
