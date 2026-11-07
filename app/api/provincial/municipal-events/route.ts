import {
  eventActor,
  readMunicipalEventRows,
  eventFailure,
} from "@/lib/municipal-events/server";
export async function GET(request: Request) {
  try {
    await eventActor(request, "provincial_admin");
    const data = await readMunicipalEventRows({ monitor: true });
    return Response.json(
      { events: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return eventFailure(error);
  }
}
