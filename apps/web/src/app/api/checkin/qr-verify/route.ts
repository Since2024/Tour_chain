import { createClient, createServiceClient } from "@/lib/supabase/server";
import { handle } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { QrVerifyInput } from "@/lib/validation/schemas";
import { verifyToken } from "@/lib/qr";

export const POST = handle(QrVerifyInput, async (body) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  if (!verifyToken(body.token, body.place_id)) {
    return jsonError(400, "invalid_token", "Invalid or expired QR token");
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

  const { data: checkin, error } = await service
    .from("check_ins")
    .insert({
      booking_id: body.booking_id,
      user_id: user.id,
      place_id: body.place_id,
      method: "qr",
      verified: true,
    })
    .select()
    .single();

  if (error) return jsonError(500, "db_error", error.message);

  return jsonOk({ checkin });
});
