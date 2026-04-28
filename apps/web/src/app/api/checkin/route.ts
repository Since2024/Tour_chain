import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { booking_id, place_id, lat, lng } = body;

  if (
    typeof booking_id !== "string" ||
    typeof place_id !== "string" ||
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify booking belongs to user
  const { data: booking } = await service
    .from("bookings")
    .select("id, tourist_id, status")
    .eq("id", booking_id)
    .single();

  if (!booking || booking.tourist_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!["confirmed", "active"].includes(booking.status)) {
    return NextResponse.json({ error: "Booking not active" }, { status: 400 });
  }

  // Server-side GPS validation: check distance to place
  const { data: place } = await service
    .from("places")
    .select("latitude, longitude")
    .eq("id", place_id)
    .single();

  if (!place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  const distance = haversineMeters(
    lat, lng,
    Number(place.latitude), Number(place.longitude)
  );

  if (distance > 500) {
    return NextResponse.json(
      { error: `Too far from checkpoint: ${Math.round(distance)}m away (max 500m)` },
      { status: 400 }
    );
  }

  const { data: checkin, error } = await service
    .from("check_ins")
    .insert({
      booking_id,
      user_id: user.id,
      place_id,
      method: "gps",
      latitude: lat,
      longitude: lng,
      verified: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkin });
}
