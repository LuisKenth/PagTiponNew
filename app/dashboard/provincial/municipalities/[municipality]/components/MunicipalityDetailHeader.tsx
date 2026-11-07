
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../../../components/ProvincialPageHeader";

type MunicipalityDetailHeaderProps = {
  municipalityName: string;
};

export default function MunicipalityDetailHeader({
  municipalityName,
}: MunicipalityDetailHeaderProps) {
  return (
    <ProvincialPageHeader
      icon={
        <Building2
          className="h-5 w-5"
          aria-hidden="true"
        />
      }
      eyebrow="Municipal Administrator Management"
      title={municipalityName}
      description="Manage municipal administrator profiles, account status, access permissions, and administrator limits."
      actions={
        <Link
          href="/dashboard/provincial/municipalities"
          className={provincialHeaderButton}
        >
          <ArrowLeft
            className="h-4 w-4"
            aria-hidden="true"
          />
          Back to Municipalities
        </Link>
      }
    />
  );
}
