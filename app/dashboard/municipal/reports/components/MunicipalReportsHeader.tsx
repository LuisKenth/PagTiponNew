import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { FileBarChart } from "lucide-react";

type MunicipalReportsHeaderProps = {
  municipality: string | null;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function MunicipalReportsHeader({
  municipality,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: MunicipalReportsHeaderProps) {
  const isRefreshing = loading || refreshing;

  return (
    <MunicipalPageHeader
      icon={<FileBarChart className="h-6 w-6" />}
      title="Municipal Reports"
      description={
        <>
          Review registration and attendance performance for provincial and
          municipal events in{" "}
          <strong>{municipality || "your municipality"}</strong>.
        </>
      }
      backHref="/dashboard/municipal"
      actions={
        <>
          <BackgroundDataSync onUpdate={onRefresh} disabled={isRefreshing} />
        </>
      }
    />
  );
}
