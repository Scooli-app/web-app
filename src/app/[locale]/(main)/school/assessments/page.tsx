import { AssessmentWeek } from "@/components/school/direction/AssessmentWeek";
import { DirectionGate } from "@/components/school/direction/DirectionGate";

export default function SchoolAssessmentsPage() {
  return (
    <DirectionGate>
      <AssessmentWeek />
    </DirectionGate>
  );
}
