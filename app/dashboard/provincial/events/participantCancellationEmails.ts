import { supabase } from "@/lib/supabase";

type DeliveryResult = {
  sent: number;
  skippedAlreadySent: number;
  skippedInProgress: number;
  failed: string[];
};

export async function sendProvincialParticipantCancellationEmails(eventId: string) {
  try {
    const { data: assignments, error } = await supabase
      .from("event_municipalities")
      .select("id")
      .eq("event_id", eventId);

    if (error || !assignments?.length) {
      return { sent: 0, needsAttention: true };
    }

    const deliveries = await Promise.allSettled(
      assignments.map(({ id }) =>
        supabase.functions.invoke<DeliveryResult>("send-participant-event-email", {
          body: {
            eventMunicipalityId: id,
            notificationType: "event_cancelled",
          },
        }),
      ),
    );

    let sent = 0;
    let needsAttention = false;
    for (const delivery of deliveries) {
      if (delivery.status === "rejected" || delivery.value.error || !delivery.value.data) {
        needsAttention = true;
        continue;
      }

      const result = delivery.value.data;
      sent += result.sent + result.skippedAlreadySent;
      needsAttention ||= result.failed.length > 0 || result.skippedInProgress > 0;
    }

    return { sent, needsAttention };
  } catch (error) {
    console.error("Unable to send participant cancellation emails:", error);
    return { sent: 0, needsAttention: true };
  }
}
