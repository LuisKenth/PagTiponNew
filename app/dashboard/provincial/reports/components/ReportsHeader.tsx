import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import { BarChart3 } from "lucide-react";
import ProvincialPageHeader from "../../components/ProvincialPageHeader";
type ReportsHeaderProps = { loading: boolean; onRefresh: () => void };
export default function ReportsHeader({
  loading,
  onRefresh,
}: ReportsHeaderProps) {
  return (
    <ProvincialPageHeader
      icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Reports & Analytics"
      title="Reports"
      description="Review event summaries, municipality participation, and participant attendance."
      actions={<BackgroundDataSync onUpdate={onRefresh} disabled={loading} />}
    />
  );
}
