import { DirectionGate } from "@/components/school/direction/DirectionGate";
import { DirectionReport } from "@/components/school/direction/DirectionReport";

export default function SchoolReportsPage() {
  return (
    <DirectionGate>
      <DirectionReport />
    </DirectionGate>
  );
}
