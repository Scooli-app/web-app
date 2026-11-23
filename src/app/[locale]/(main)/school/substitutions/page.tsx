import { DirectionGate } from "@/components/school/direction/DirectionGate";
import { SubstitutionsBoard } from "@/components/school/direction/SubstitutionsBoard";

export default function SchoolSubstitutionsPage() {
  return (
    <DirectionGate>
      <SubstitutionsBoard />
    </DirectionGate>
  );
}
