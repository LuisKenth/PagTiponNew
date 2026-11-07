import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderPrimaryButton,
} from "../../components/ProvincialPageHeader";
export default function EventsHeader() {
  return (
    <ProvincialPageHeader
      icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Event Management"
      title="Provincial Events"
      description="Manage provincial events, official memos, target municipalities, and preparation progress."
      actions={
        <Link
          href="/dashboard/provincial/events/create"
          className={provincialHeaderPrimaryButton}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Provincial Event
        </Link>
      }
    />
  );
}
