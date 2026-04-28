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

// Demo services used as fallback when database has no records
const DEMO_SERVICES = [
  { id: "demo-svc-1", guide_id: "demo-guide-1", route_id: null, title: "Budget Trek Package", price_usd: 199 },
  { id: "demo-svc-2", guide_id: "demo-guide-2", route_id: null, title: "Standard Guide + Porter", price_usd: 349 },
  { id: "demo-svc-3", guide_id: "demo-guide-3", route_id: null, title: "Premium All-Inclusive", price_usd: 699 },
  { id: "demo-svc-4", guide_id: "demo-guide-4", route_id: null, title: "Luxury Summit Experience", price_usd: 1299 },
];

async function fetchRows(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>): Promise<ServiceRow[]> {
  const full      = supabase.from("services").select("id,guide_id,route_id,title,price_usd").order("created_at", { ascending: false });
  const altSol    = supabase.from("services").select("id,guide_id,route_id,title,price_sol").order("created_at", { ascending: false });
  const altNoPrice = supabase.from("services").select("id,guide_id,route_id,title").order("created_at", { ascending: false });

  // Try with is_active filter first
  const res1 = await full.eq("is_active", true);
  if (!res1.error) return (res1.data ?? []) as unknown as ServiceRow[];

  // is_active column missing — try without filter
  if (res1.error.message.includes("is_active") && res1.error.message.includes("does not exist")) {
    const res2 = await full;
    if (!res2.error) return (res2.data ?? []) as unknown as ServiceRow[];

    // price_usd column missing — try price_sol
    if (res2.error.message.includes("price_usd") && res2.error.message.includes("does not exist")) {
      const res3 = await altSol;
      if (!res3.error) return (res3.data ?? []) as unknown as ServiceRow[];

      // price_sol also missing — try no price column
      if (res3.error.message.includes("price_sol") && res3.error.message.includes("does not exist")) {
        const res4 = await altNoPrice;
        if (!res4.error) return (res4.data ?? []) as unknown as ServiceRow[];
      }
    }
  }

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");

  const supabase = await createClient();
  if (!supabase) {
    // Return demo services when Supabase is not configured
    const demos = DEMO_SERVICES.map(s => ({ ...s, route_id: routeId ?? null }));
    return jsonOk({ services: demos });
  }

  const allRows = await fetchRows(supabase);

  // Filter by routeId if provided — but also include services with null route_id (global services)
  const filtered = allRows.filter((row) => {
    if (!routeId) return true;
    return row.route_id === routeId || row.route_id === null;
  });

  const normalized = filtered.map((row) => ({
    id: row.id,
    guide_id: row.guide_id,
    route_id: row.route_id,
    title: row.title,
    price_usd: row.price_usd ?? row.price_sol ?? 0,
  }));

  // If no services in DB at all, return demo services
  if (normalized.length === 0) {
    const demos = DEMO_SERVICES.map(s => ({ ...s, route_id: routeId ?? null }));
    return jsonOk({ services: demos });
  }

  return jsonOk({ services: normalized });
}
