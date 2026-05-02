import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrors } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";

export const GET = withErrors(async (_req: NextRequest) => {
  const supabase = await createClient();

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
});
