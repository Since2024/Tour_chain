import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/qr";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { token, booking_id, place_id } = body;

  if (
    typeof token !== "string" ||
    typeof booking_id !== "string" ||
    typeof place_id !== "string"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const isValid = verifyToken(token, place_id);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired QR token" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: booking } = await service
    .from("bookings")
    .select("id, tourist_id, status")
    .eq("id", booking_id)
    .single();

  if (!booking || booking.tourist_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: checkin, error } = await service
    .from("check_ins")
    .insert({
      booking_id,
      user_id: user.id,
      place_id,
      method: "qr",
      verified: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkin });
}
