import { Building2 } from "lucide-react";
import ProvincialPageHeader from "../../components/ProvincialPageHeader";
export default function MunicipalitiesHeader() {
  return (
    <ProvincialPageHeader
      icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Municipal Coordination"
      title="Municipalities"
      description="Monitor municipality coverage, manage municipal administrators, and review pending account applications."
    />
  );
}
