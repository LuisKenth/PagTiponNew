import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";
import {
  Settings2,
  ShieldCheck,
} from "lucide-react";

export default function SettingsHeader() {
  return (
    <MunicipalPageHeader
      icon={<Settings2 className="h-6 w-6" />}
      title="Municipal Settings"
      description="Manage your municipal administrator profile and account security."
      actions={<span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" />Protected account</span>}
    />
  );
}
