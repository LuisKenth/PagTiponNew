-- PagTipon Objective #5: dedicated delivery tracking for automatic after-event emails.
-- No existing table or sender is modified.
-- Run ONCE in the Supabase SQL Editor before deploying/invoking the new function.

CREATE TABLE IF NOT EXISTS public.after_event_acknowledgment_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_municipality_id uuid NOT NULL REFERENCES public.event_municipalities(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider text NOT NULL DEFAULT 'brevo',
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT after_event_ack_deliveries_unique_recipient
    UNIQUE (event_municipality_id, participant_id)
);

CREATE INDEX IF NOT EXISTS after_event_ack_deliveries_status_idx
ON public.after_event_acknowledgment_deliveries (status, created_at DESC);

-- This table is backend-only. No anon/authenticated access policies are created.
ALTER TABLE public.after_event_acknowledgment_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.after_event_acknowledgment_deliveries IS
  'Backend-only after-event acknowledgment email tracking; sent means accepted by Brevo, not confirmed inbox delivery.';
