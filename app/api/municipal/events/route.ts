import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  eventActor,
  readMunicipalEventRows,
  eventFailure,
  EventRequestError,
} from "@/lib/municipal-events/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const actor = await eventActor(request, "municipal_admin");
    const id = new URL(request.url).searchParams.get("id");
    const [events, { data: venues, error: venueError }] = await Promise.all([
      readMunicipalEventRows({ municipality: actor.municipality, id }),
      supabaseAdmin
        .from("venues")
        .select("id,venue_name,capacity,status")
        .eq("municipality", actor.municipality)
        .order("venue_name"),
    ]);
    if (venueError)
      throw new EventRequestError("Unable to load venues. Try again.", 503);
    return Response.json(
      { events, venues, municipality: actor.municipality },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return eventFailure(error);
  }
}
export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    const actor = await eventActor(request, "municipal_admin");
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4 * 1024 * 1024)
      throw new EventRequestError("Upload one PDF no larger than 3 MB.");
    const form = await request.formData();
    const id = String(form.get("id") || "");
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        id,
      )
    )
      throw new EventRequestError("Invalid event identifier.");
    const payload = JSON.parse(String(form.get("payload") || "{}"));
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("events")
      .select("event_origin,owner_municipality")
      .eq("id", id)
      .maybeSingle();
    if (existingError)
      throw new EventRequestError("Unable to verify event access.", 503);
    if (
      existing &&
      (existing.event_origin !== "municipal" ||
        existing.owner_municipality !== actor.municipality)
    )
      throw new EventRequestError("Event access denied.", 403);
    const file = form.get("document");
    let document = null;
    if (file instanceof File && file.size) {
      if (
        file.size > 3 * 1024 * 1024 ||
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf") ||
        file.name.length > 255
      )
        throw new EventRequestError(
          "Choose a PDF approval document, maximum 3 MB.",
        );
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        throw new EventRequestError("The document must be a valid PDF file.");
      const digest = createHash("sha256").update(bytes).digest("hex");
      const path = `municipal-memos/${actor.id}/${id}/${digest}.pdf`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("official-memos")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (
        uploadError &&
        !["409", "Duplicate"].includes(String(uploadError.statusCode))
      )
        throw new EventRequestError(
          "Document upload failed. Your changes have not been published; try again.",
          503,
        );
      if (!uploadError) uploadedPath = path;
      const { data: url } = supabaseAdmin.storage
        .from("official-memos")
        .getPublicUrl(path);
      document = {
        file_name: file.name,
        file_path: path,
        file_url: url.publicUrl,
        file_size: file.size,
      };
    }
    const { data, error } = await supabaseAdmin.rpc("save_municipal_event", {
      p_actor: actor.id,
      p_id: id,
      p_payload: payload,
      p_document: document,
      p_expected: form.get("expected") || null,
    });
    if (error) {
      // Remove only an upload that the transaction did not attach. Never delete on an ambiguous network failure.
      if (
        uploadedPath &&
        error.code &&
        !["PGRST000", "PGRST001", "PGRST002"].includes(error.code)
      ) {
        const { data: attached, error: checkError } = await supabaseAdmin
          .from("event_memos")
          .select("id")
          .eq("event_id", id)
          .eq("file_path", uploadedPath)
          .limit(1);
        if (!checkError && attached?.length === 0)
          await supabaseAdmin.storage
            .from("official-memos")
            .remove([uploadedPath]);
      }
      throw new EventRequestError(
        error.message,
        error.code === "42501" ? 403 : error.code === "40001" ? 409 : 400,
      );
    }
    return Response.json({ event: data });
  } catch (error) {
    return eventFailure(error);
  }
}
