"use client";
import EventCertificateSetup from "@/app/components/certificates/EventCertificateSetup";
export default function CertificateSignatoriesCard({
  eventId,
}: {
  eventId: string;
}) {
  return <EventCertificateSetup eventId={eventId} />;
}
