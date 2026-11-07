export type ProofState = {
 status: "pending" | "approved" | "rejected";
 invalidated_at: string | null;
 withdrawn_at: string | null;
};
export function proofLabel(item: ProofState) {
 return item.withdrawn_at ? "Withdrawn" : item.invalidated_at ? "Outdated" :
 item.status === "pending" ? "Pending Review" : item.status === "approved" ? "Approved" : "Rejected";
}
export function currentProof(item: ProofState) {
 return !item.invalidated_at && !item.withdrawn_at;
}
