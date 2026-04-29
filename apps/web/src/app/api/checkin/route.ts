import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { handle, rateLimit, clientIp } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { CheckinInput } from "@/lib/validation/schemas";
import { haversineMeters } from "@/lib/geo";

export const POST = handle(CheckinInput, async (body, req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  // 10 requests/min per user
  if (!rateLimit(`checkin:${user.id}`, 10, 60_000)) {
    return jsonError(429, "rate_limited", "Too many requests — try again in a minute");
  }

  const service = createServiceClient();

  const { data: booking } = await service
    .from("bookings")
    .select("id, tourist_id, status")
    .eq("id", body.booking_id)
    .single();

  if (!booking || booking.tourist_id !== user.id) {
    return jsonError(404, "not_found", "Booking not found");
  }
  if (!["confirmed", "active"].includes(booking.status)) {
    return jsonError(400, "booking_not_active", "Booking not active");
  }

  const { data: place } = await service
    .from("places")
    .select("latitude, longitude")
    .eq("id", body.place_id)
    .single();

  if (!place) return jsonError(404, "not_found", "Place not found");

  const distance = haversineMeters(
    body.lat, body.lng,
    Number(place.latitude), Number(place.longitude)
  );

  if (distance > 500) {
    return jsonError(400, "too_far", `Too far from checkpoint: ${Math.round(distance)}m away (max 500m)`);
  }

  const { data: checkin, error } = await service
    .from("check_ins")
    .insert({
      booking_id: body.booking_id,
      user_id: user.id,
      place_id: body.place_id,
      method: "gps",
      latitude: body.lat,
      longitude: body.lng,
      verified: true,
    })
    .select()
    .single();

  if (error) return jsonError(500, "db_error", error.message);

  void clientIp(req); // req used for future audit logging
  return jsonOk({ checkin });
});
