import { BarChart3, RefreshCw } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../../components/ProvincialPageHeader";
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
      actions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={provincialHeaderButton}
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Refreshing..." : "Refresh Reports"}
        </button>
      }
    />
  );
}
