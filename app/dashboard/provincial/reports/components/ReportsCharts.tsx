"use client";

import { useMemo } from "react";

// Keep interfaces compatible with Provincial Reports' existing aggregates.
export type EventChartRow = {
  id: string;
  title: string;
  status: string;
  registrations: number;
  attended: number;
  finalRate: number | null;
  participationRate: number | null;
  completedAttended: number;
  completedRegistrations: number;
};

export type MunicipalityChartRow = {
  municipality: string;
  assignedEvents: number;
  registrations: number;
  attended: number;
  finalRate: number | null;
  participationRate: number | null;
  completedAttended: number;
  completedRegistrations: number;
};

export type ParticipantChartRow = {
  category: string;
  status: string;
  checkedInAt: string | null;
};

type Tab = "events" | "municipalities" | "participants";

type Props = {
  tab: Tab;
  events: EventChartRow[];
  municipalities: MunicipalityChartRow[];
  participants: ParticipantChartRow[];
};

type ComparisonRow = {
  key: string;
  label: string;
  registered: number;
  attended: number;
};

const REGISTERED_COLOR = "#6366f1";
const ATTENDED_COLOR = "#10b981";
const GRID_COLOR = "#e2e8f0";
const LABEL_COLOR = "#334155";

function wasPresent(status: string): boolean {
  return ["present", "late"].includes(status.trim().toLowerCase());
}

function getTicks(rows: ComparisonRow[]) {
  const maximum = Math.max(1, ...rows.flatMap((row) => [row.registered, row.attended]));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const cap = Math.ceil(maximum / step) * step;
  return { cap, ticks: Array.from({ length: Math.floor(cap / step) + 1 }, (_, i) => i * step) };
}

function labelLines(label: string): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (trial.length > 15 && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  // Long single words remain accessible by SVG title.
  return lines.slice(0, 3);
}

function GroupedBarChart({ rows, label }: { rows: ComparisonRow[]; label: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
        No registrations match the selected filters.
      </p>
    );
  }

  const { cap, ticks } = getTicks(rows);
  const left = 48;
  const right = 24;
  const top = 34;
  const plotHeight = 218;
  const baseline = top + plotHeight;
  const groupWidth = 124;
  const barWidth = 28;
  const width = Math.max(580, left + right + rows.length * groupWidth);
  const height = 335;
  const y = (value: number) => baseline - (value / cap) * plotHeight;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: REGISTERED_COLOR }} />
          Registered
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ATTENDED_COLOR }} />
          Attended (Present + Late)
        </span>
      </div>
      <div
        className="w-full overflow-x-auto rounded-lg border border-slate-200"
        role="region"
        aria-label={`${label}; scroll horizontally to review all categories`}
        tabIndex={0}
      >
        <svg
          className="block"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${label}: registered and attended registrations`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                y1={y(tick)}
                x2={width - right}
                y2={y(tick)}
                stroke={GRID_COLOR}
                strokeDasharray={tick === 0 ? undefined : "4 4"}
              />
              <text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {tick}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const center = left + index * groupWidth + groupWidth / 2;
            const bars = [
              { name: "Registered", value: row.registered, color: REGISTERED_COLOR, x: center - barWidth - 4 },
              { name: "Attended", value: row.attended, color: ATTENDED_COLOR, x: center + 4 },
            ];
            const wrapped = labelLines(row.label);
            return (
              <g key={row.key}>
                {bars.map((bar) => (
                  <g key={bar.name}>
                    {bar.value > 0 && (
                      <rect
                        x={bar.x}
                        y={y(bar.value)}
                        width={barWidth}
                        height={baseline - y(bar.value)}
                        rx="4"
                        fill={bar.color}
                      >
                        <title>{`${row.label}: ${bar.value} ${bar.name.toLowerCase()}`}</title>
                      </rect>
                    )}
                    {bar.value > 0 && (
                      <text
                        x={bar.x + barWidth / 2}
                        y={y(bar.value) - 7}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill={LABEL_COLOR}
                      >
                        {bar.value}
                      </text>
                    )}
                  </g>
                ))}
                {row.registered === 0 && row.attended === 0 && (
                  <text x={center} y={baseline - 9} textAnchor="middle" fontSize="11" fill="#94a3b8">0</text>
                )}
                <text x={center} y={baseline + 22} textAnchor="middle" fontSize="11" fill={LABEL_COLOR}>
                  <title>{row.label}</title>
                  {wrapped.map((part, lineIndex) => (
                    <tspan key={lineIndex} x={center} dy={lineIndex === 0 ? 0 : 14}>
                      {part}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Each value counts event registrations (not unique people). Scroll sideways to compare all items.
        Use the table below for exact counts, rates, and zero-activity entries.
      </p>
    </div>
  );
}

export default function ReportsCharts({ tab, events, municipalities, participants }: Props) {
  const eventRows = useMemo<ComparisonRow[]>(() =>
    [...events]
      .sort((a, b) => b.registrations - a.registrations || a.title.localeCompare(b.title))
      .slice(0, 8)
      .map((event) => ({
        key: event.id,
        label: event.title,
        registered: event.registrations,
        attended: event.attended,
      })),
    [events],
  );

  const municipalRows = useMemo<ComparisonRow[]>(() =>
    [...municipalities]
      .sort((a, b) => a.municipality.localeCompare(b.municipality))
      .map((row) => ({
        key: row.municipality,
        label: row.municipality,
        registered: row.registrations,
        attended: row.attended,
      })),
    [municipalities],
  );

  const categoryRows = useMemo<ComparisonRow[]>(() => {
    const grouped = new Map<string, { registered: number; attended: number }>();
    for (const participant of participants) {
      const name = participant.category.trim() || "Uncategorized";
      const current = grouped.get(name) || { registered: 0, attended: 0 };
      current.registered += 1;
      if (wasPresent(participant.status)) current.attended += 1;
      grouped.set(name, current);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[1].registered - a[1].registered || a[0].localeCompare(b[0]))
      .map(([name, counts]) => ({ key: name, label: name, ...counts }));
  }, [participants]);

  const chart = tab === "events"
    ? {
        heading: "Event Attendance Comparison",
        description: "Registered versus Attended for the eight events with the most registrations.",
        rows: eventRows,
        label: "Event attendance comparison",
      }
    : tab === "municipalities"
      ? {
          heading: "Municipality Participation",
          description: "Registered versus Attended across all 18 municipalities, including zero activity.",
          rows: municipalRows,
          label: "Municipality participation comparison",
        }
      : {
          heading: "Participation by Category",
          description: "Registered versus Attended participants grouped by participant category.",
          rows: categoryRows,
          label: "Category participation comparison",
        };

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{chart.heading}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{chart.description}</p>
      <div className="mt-5">
        <GroupedBarChart rows={chart.rows} label={chart.label} />
      </div>
      {tab === "events" && events.length > 8 && (
        <p className="mt-2 text-xs text-slate-500">Showing 8 of {events.length} events. The table below contains every matching event.</p>
      )}
    </section>
  );
}
