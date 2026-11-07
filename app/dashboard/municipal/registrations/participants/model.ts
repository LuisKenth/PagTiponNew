export type Participant = {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  municipality: string | null;
  participant_category: string | null;
  participant_category_other: string | null;
  verification_status: string | null;
  verification_revision: number | string;
  created_at: string | null;
};
export type Proof = {
  id: string;
  participant_id: string;
  verification_type: string;
  municipality: string;
  participant_category: string | null;
  participant_category_other: string | null;
  profile_revision: number | string;
  status: string;
  submitted_at: string;
  invalidated_at: string | null;
  withdrawn_at: string | null;
};
export const VERIFICATION_LABELS = {
  verified: "Verified",
  pending: "Pending Review",
  incomplete: "Incomplete",
  rejected: "Rejected",
  restricted: "Account Restricted",
} as const;
export type VerificationState = keyof typeof VERIFICATION_LABELS;
export const CATEGORY_LABELS = {
  farmer: "Farmer",
  fisherman: "Fisherman",
  senior_citizen: "Senior Citizen",
  "4ps": "4Ps",
  others: "Others",
  unspecified: "Not specified",
} as const;
export type Category = keyof typeof CATEGORY_LABELS;
export type ParticipantRow = Participant & {
  category: Category;
  categoryLabel: string;
  verification: VerificationState;
  residency: string;
  categoryProof: string;
};
export function normalizeSearch(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
export function categoryKey(value: string | null): Category {
  const normalized = normalizeSearch(value).replace(/[ -]+/g, "_");
  return Object.hasOwn(CATEGORY_LABELS, normalized)
    ? (normalized as Category)
    : "unspecified";
}
function latestProof(rows: Proof[]) {
  return [...rows].sort(
    (a, b) =>
      Date.parse(b.submitted_at) - Date.parse(a.submitted_at) ||
      b.id.localeCompare(a.id),
  )[0];
}
function proofState(
  proof: Proof | undefined,
  participant: Participant,
  type: "residency" | "category",
) {
  if (
    !proof ||
    proof.invalidated_at ||
    proof.withdrawn_at ||
    String(proof.profile_revision) !==
      String(participant.verification_revision) ||
    proof.municipality !== participant.municipality ||
    (type === "category" &&
      (proof.participant_category !== participant.participant_category ||
        proof.participant_category_other !==
          participant.participant_category_other))
  )
    return "Missing / outdated";
  return proof.status === "approved"
    ? "Approved"
    : proof.status === "pending"
      ? "Pending"
      : proof.status === "rejected"
        ? "Rejected"
        : "Missing / outdated";
}
export function participantDirectory(
  profiles: Participant[],
  proofs: Proof[],
  municipality: string,
): ParticipantRow[] {
  const grouped = new Map<string, Proof[]>();
  for (const proof of proofs) {
    const rows = grouped.get(proof.participant_id) || [];
    rows.push(proof);
    grouped.set(proof.participant_id, rows);
  }
  return [...new Map(profiles.map((profile) => [profile.id, profile])).values()]
    .filter(
      (profile) =>
        profile.role === "participant" &&
        normalizeSearch(profile.municipality) === normalizeSearch(municipality),
    )
    .map((profile) => {
      const rows = grouped.get(profile.id) || [];
      const residency = proofState(
        latestProof(
          rows.filter((row) => row.verification_type === "residency"),
        ),
        profile,
        "residency",
      );
      const categoryProof = proofState(
        latestProof(rows.filter((row) => row.verification_type === "category")),
        profile,
        "category",
      );
      const verification: VerificationState =
        profile.verification_status !== "approved"
          ? "restricted"
          : residency === "Approved" && categoryProof === "Approved"
            ? "verified"
            : [residency, categoryProof].includes("Rejected")
              ? "rejected"
              : [residency, categoryProof].includes("Pending")
                ? "pending"
                : "incomplete";
      const category = categoryKey(profile.participant_category);
      return {
        ...profile,
        category,
        categoryLabel:
          category === "others" && profile.participant_category_other
            ? `Others · ${profile.participant_category_other}`
            : CATEGORY_LABELS[category],
        verification,
        residency,
        categoryProof,
      };
    })
    .sort(
      (a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "", "en", {
          sensitivity: "base",
          numeric: true,
        }) || a.id.localeCompare(b.id),
    );
}
export function filterParticipants(
  rows: ParticipantRow[],
  query: string,
  category: string,
  verification: string,
) {
  const q = normalizeSearch(query);
  let phoneQuery = /^[+\d()\s-]+$/.test(q) ? q.replace(/\D/g, "") : "";
  if (phoneQuery.startsWith("09")) phoneQuery = phoneQuery.slice(1);
  else if (phoneQuery.startsWith("639")) phoneQuery = phoneQuery.slice(2);
  return rows.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      (verification === "all" || row.verification === verification) &&
      (!q ||
        normalizeSearch(
          [row.full_name, row.email, row.mobile_number, row.categoryLabel].join(
            " ",
          ),
        ).includes(q) ||
        (phoneQuery.length >= 3 &&
          (row.mobile_number || "").replace(/\D/g, "").includes(phoneQuery))),
  );
}
export function joinedDate(value: string | null) {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "—";
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function participantsCsv(rows: ParticipantRow[]) {
  return (
    "\uFEFF" +
    [
      [
        "Name",
        "Email",
        "Mobile Number",
        "Municipality",
        "Category",
        "Verification",
        "Residency Proof",
        "Category Proof",
        "Joined (PH)",
      ],
      ...rows.map((row) => [
        row.full_name || "Unnamed participant",
        row.email || "",
        row.mobile_number || "",
        row.municipality || "",
        row.categoryLabel,
        VERIFICATION_LABELS[row.verification],
        row.residency,
        row.categoryProof,
        joinedDate(row.created_at),
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
