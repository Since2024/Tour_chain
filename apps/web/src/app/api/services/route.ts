import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/response";

type ServiceRow = {
  id: string;
  guide_id: string;
  route_id: string | null;
  title: string;
  price_usd?: number | null;
  price_sol?: number | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return jsonOk({ services: [] });
  }

  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");

  const full = supabase.from("services").select("id,guide_id,route_id,title,price_usd").order("created_at", { ascending: false });
  const altSol = supabase.from("services").select("id,guide_id,route_id,title,price_sol").order("created_at", { ascending: false });
  const altNoPrice = supabase.from("services").select("id,guide_id,route_id,title").order("created_at", { ascending: false });

  let rows: ServiceRow[] = [];

  const res1 = await full.eq("is_active", true);
  if (!res1.error) {
    rows = (res1.data ?? []) as unknown as ServiceRow[];
  } else if (res1.error.message.includes("is_active") && res1.error.message.includes("does not exist")) {
    const res2 = await full;
    if (!res2.error) {
      rows = (res2.data ?? []) as unknown as ServiceRow[];
    } else if (res2.error.message.includes("price_usd") && res2.error.message.includes("does not exist")) {
      const res3 = await altSol;
      if (!res3.error) {
        rows = (res3.data ?? []) as unknown as ServiceRow[];
      } else if (res3.error.message.includes("price_sol") && res3.error.message.includes("does not exist")) {
        const res4 = await altNoPrice;
        if (res4.error) {
          return jsonError(500, "db_error", res4.error.message);
        }
        rows = (res4.data ?? []) as unknown as ServiceRow[];
      } else {
        return jsonError(500, "db_error", res3.error.message);
      }
    } else {
      return jsonError(500, "db_error", res2.error.message);
    }
  } else {
    return jsonError(500, "db_error", res1.error.message);
  }

  const normalized = rows
    .filter((row) => (routeId ? row.route_id === routeId : true))
    .map((row) => ({
      id: row.id,
      guide_id: row.guide_id,
      route_id: row.route_id,
      title: row.title,
      price_usd: row.price_usd ?? row.price_sol ?? 0,
    }));

  return jsonOk({ services: normalized });
}
