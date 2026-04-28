import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/response";

type IdName = { id: string; name?: string };

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return jsonOk({ proofs: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonOk({ proofs: [] });
  }

  const { data, error } = await supabase
    .from("completion_proofs")
    .select("id,booking_id,route_id,nft_mint_address,metadata_uri,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(500, "db_error", error.message);
  }

  const proofs = (data ?? []) as Array<{
    id: string;
    booking_id: string;
    route_id: string | null;
    nft_mint_address: string | null;
    metadata_uri: string | null;
    created_at: string;
  }>;

  const routeIds = Array.from(new Set(proofs.map((p) => p.route_id).filter(Boolean))) as string[];
  const routesRes = routeIds.length
    ? await supabase.from("routes").select("id,name").in("id", routeIds)
    : ({ data: [] as IdName[], error: null as unknown } as const);
  if (routesRes.error) return jsonError(500, "db_error", "Failed to load routes", routesRes.error);
  const routeById = new Map((routesRes.data ?? []).map((r) => [r.id, r]));

  return jsonOk({
    proofs: proofs.map((p) => ({
      ...p,
      route: p.route_id ? { name: routeById.get(p.route_id)?.name } : null,
    })),
  });
}
