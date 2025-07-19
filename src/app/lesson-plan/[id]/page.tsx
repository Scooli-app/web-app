"use client";

import LessonPlanEditor from "@/components/lesson-plan/LessonPlanEditor";
import { useParams } from "next/navigation";

export default function LessonPlanPage() {
  const params = useParams();
  const documentId = params.id as string;

  return (
    <div className="min-h-screen bg-[#EEF0FF]">
      <LessonPlanEditor documentId={documentId} />
    </div>
  );
}
