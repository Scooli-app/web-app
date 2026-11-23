import { DirectionGate } from "@/components/school/direction/DirectionGate";
import { LearningList } from "@/components/school/direction/LearningList";

export default function SchoolLearningPage() {
  return (
    <DirectionGate>
      <LearningList />
    </DirectionGate>
  );
}
