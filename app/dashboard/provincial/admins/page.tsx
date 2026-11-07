import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../components/ProvincialPageHeader";
export default function MovedAdminManagement() {
  return (
    <ProvincialPageHeader
      icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Administration"
      title="Administrator Management"
      description="Only the Super Admin can create and manage Provincial Admin accounts."
      actions={
        <Link href="/dashboard/provincial" className={provincialHeaderButton}>
          Back to Dashboard
        </Link>
      }
    />
  );
}
