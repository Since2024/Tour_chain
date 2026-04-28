import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return jsonOk({ places: [] });
  }

  const full = supabase.from("places").select("id,name,description,latitude,longitude");
  const alt = supabase.from("places").select("id,name,description,lat,lng");
  type PlaceAlt = { id: string; name: string; description: string | null; lat: number; lng: number };

  // Prefer maximum compatibility: don't rely on optional `is_active` column.
  let { data, error } = await full.order("name");

  if (error?.message?.includes("latitude") && error.message.includes("does not exist")) {
    const retry = await alt.order("name");
    // Normalize to expected output shape for the frontend map.
    data = ((retry.data ?? []) as PlaceAlt[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      latitude: p.lat,
      longitude: p.lng,
    }));
    error = retry.error;
  }

  if (error) {
    return jsonError(500, "db_error", error.message);
  }

  return jsonOk({ places: data ?? [] });
}
