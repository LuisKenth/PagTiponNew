import { ArrowLeft, CalendarPlus, FilePenLine } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../../../components/ProvincialPageHeader";
type Props = { editing?: boolean; onBack: () => void; disabled?: boolean };
export default function CreateEventHeader({
  onBack,
  disabled = false,
  editing = false,
}: Props) {
  return (
    <ProvincialPageHeader
      icon={<CalendarPlus className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Event Management"
      title={editing ? "Edit Draft Event" : "Create New Event"}
      description="Plan your provincial event, choose its audience, and coordinate with your municipalities."
      actions={
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className={provincialHeaderButton}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Events
        </button>
      }
      footer={
        <>
          <FilePenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
          Complete the sections below, then review your event before publishing.
        </>
      }
    />
  );
}
