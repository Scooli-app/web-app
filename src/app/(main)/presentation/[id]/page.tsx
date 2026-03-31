import { PresentationEditor } from "@/components/presentation/PresentationEditor";

interface PresentationEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function PresentationEditorPage({
  params,
}: PresentationEditorPageProps) {
  const { id } = await params;

  return <PresentationEditor presentationId={id} />;
}
