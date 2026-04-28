import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return jsonOk(
      {
        routes: [
          { id: "local-1", name: "Poon Hill Sunrise Trek", region: "Annapurna", difficulty: "easy", duration_days: 4, image_url: null },
          { id: "local-2", name: "Langtang Valley", region: "Langtang", difficulty: "moderate", duration_days: 8, image_url: null },
        ],
      },
      { status: 200 },
    );
  }

  const full = supabase.from("routes").select("id,name,region,difficulty,duration_days,image_url,max_altitude_meters");
  const minimal = supabase.from("routes").select("id,name,region,difficulty,duration_days");

  let routes: unknown[] | null = null;
  let error: { message: string } | null = null;

  const first = await full.eq("is_active", true).order("name", { ascending: true });
  routes = first.data as unknown[] | null;
  error = first.error ? { message: first.error.message } : null;
  if (error?.message?.includes("is_active") && error.message.includes("does not exist")) {
    const retry = await full.order("name", { ascending: true });
    routes = retry.data as unknown[] | null;
    error = retry.error ? { message: retry.error.message } : null;
  }

  if (error?.message?.includes("image_url") && error.message.includes("does not exist")) {
    // Schema variant: routes table without optional presentation columns.
    let retry = await minimal.eq("is_active", true).order("name", { ascending: true });
    if (retry.error?.message?.includes("is_active") && retry.error.message.includes("does not exist")) {
      retry = await minimal.order("name", { ascending: true });
    }
    routes = retry.data as unknown[] | null;
    error = retry.error ? { message: retry.error.message } : null;
  }

  if (error) {
    return jsonError(500, "db_error", error.message);
  }

  return jsonOk({ routes: routes ?? [] });
}
