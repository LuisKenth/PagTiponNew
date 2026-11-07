import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      return Response.json({ error: "Please log in again." }, { status: 401 });
    const token = authorization.slice(7);
    const { data: auth, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    if (authError || !auth.user)
      return Response.json({ error: "Please log in again." }, { status: 401 });
    const body = await request.json();
    if (
      typeof body.venueId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.venueId,
      )
    )
      return Response.json({ error: "Invalid venue." }, { status: 400 });
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { error } = await client.rpc("delete_venue_with_photos", {
      p_venue_id: body.venueId,
    });
    if (error)
      return Response.json(
        { error: error.message },
        { status: error.code === "42501" ? 403 : 409 },
      );
    // Only server-recorded paths are accepted, never paths supplied by the browser.
    const { data: job, error: jobError } = await supabaseAdmin
      .from("venue_photo_cleanup")
      .select("photo_paths")
      .eq("venue_id", body.venueId)
      .single();
    if (jobError || !job)
      return Response.json({ deleted: true, cleanupPending: true });
    if (job.photo_paths.length) {
      const { error: removeError } = await supabaseAdmin.storage
        .from("venue-photos")
        .remove(job.photo_paths);
      if (removeError)
        return Response.json({ deleted: true, cleanupPending: true });
    }
    const { error: finishError } = await supabaseAdmin
      .from("venue_photo_cleanup")
      .delete()
      .eq("venue_id", body.venueId);
    return Response.json({
      deleted: true,
      cleanupPending: Boolean(finishError),
    });
  } catch {
    return Response.json(
      {
        error:
          "Unable to confirm deletion. Check your connection and try again.",
      },
      { status: 500 },
    );
  }
}
