type MunicipalNotificationBadgeProps = {
  count: number;
  active?: boolean;
  floating?: boolean;
};

export default function MunicipalNotificationBadge({
  count,
  active = false,
  floating = false,
}: MunicipalNotificationBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const displayedCount = count > 99 ? "99+" : String(count);

  if (floating) {
    return (
      <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
        {displayedCount}
      </span>
    );
  }

  return (
    <span
      className={`flex min-h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
        active
          ? "bg-white text-slate-950"
          : "bg-red-600 text-white"
      }`}
    >
      {displayedCount}
    </span>
  );
}