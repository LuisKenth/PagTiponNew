import type { DashboardMessage as DashboardMessageType } from "../types";

type DashboardMessageProps = {
  message: DashboardMessageType | null;
};

export default function DashboardMessage({
  message,
}: DashboardMessageProps) {
  if (!message) return null;

  const messageClass =
    message.tone === "success"
      ? "bg-green-50 text-green-700"
      : message.tone === "error"
        ? "bg-red-50 text-red-700"
        : "bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg p-4 text-sm font-medium ${messageClass}`}>
      {message.text}
    </div>
  );
}
