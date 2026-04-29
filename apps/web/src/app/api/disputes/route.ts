import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handle, withErrors, rateLimit } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { DisputeInput } from "@/lib/validation/schemas";

export const GET = withErrors(async (_req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  const { data, error } = await supabase
    .from("disputes")
    .select("id,category,status,description,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return jsonError(500, "db_error", error.message);

  return jsonOk({ disputes: data ?? [] });
});

export const POST = handle(DisputeInput, async (body, req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  // 5 disputes/min per user — disputes shouldn't be spammed
  if (!rateLimit(`disputes:${user.id}`, 5, 60_000)) {
    return jsonError(429, "rate_limited", "Too many requests — try again in a minute");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, tourist_id, guide_id, status")
    .eq("id", body.bookingId)
    .single();

  if (!booking) return jsonError(404, "not_found", "Booking not found");
  if (booking.tourist_id !== user.id && booking.guide_id !== user.id) {
    return jsonError(403, "forbidden", "Not your booking");
  }

  const { data: dispute, error } = await supabase
    .from("disputes")
    .insert({
      booking_id: body.bookingId,
      filed_by: user.id,
      category: body.category,
      description: body.description,
      evidence_urls: body.evidenceUrls,
      status: "open",
    })
    .select()
    .single();

  if (error) return jsonError(500, "db_error", error.message);

  void req; // req available for future audit logging
  return jsonOk({ dispute }, { status: 201 });
});
