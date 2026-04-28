import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { BookingStatusUpdateInput } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ bookingId: string }>;
};

type BookingRowUsd = {
  id: string;
  tourist_id: string;
  guide_id: string;
  route_id: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  total_price_usd: number;
};

type BookingRowAlt = Omit<BookingRowUsd, "total_price_usd"> & { total_price: number };

export async function GET(_request: Request, context: Context) {
  const { bookingId } = await context.params;
  const supabase = await createClient();
  if (!supabase) {
    return jsonError(500, "missing_env", "Supabase env is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "unauthorized", "Unauthorized");
  }

  let { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,tourist_id,guide_id,route_id,status,start_date,end_date,total_price_usd")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError?.message?.includes("total_price_usd") && bookingError.message.includes("does not exist")) {
    const retry = await supabase
      .from("bookings")
      .select("id,tourist_id,guide_id,route_id,status,start_date,end_date,total_price")
      .eq("id", bookingId)
      .maybeSingle();
    const alt = retry.data as BookingRowAlt | null;
    booking = alt
      ? ({
          ...alt,
          total_price_usd: alt.total_price,
        } satisfies BookingRowUsd)
      : null;
    bookingError = retry.error;
  }

  if (bookingError || !booking) {
    return jsonError(404, "not_found", "Booking not found");
  }
  if (booking.tourist_id !== user.id) {
    return jsonError(403, "forbidden", "Forbidden");
  }

  const { data: checkpoints } = await supabase
    .from("route_checkpoints")
    .select("id,sequence_order,is_required,place:places(id,name,latitude,longitude)")
    .eq("route_id", booking.route_id)
    .order("sequence_order");

  const { data: checkins } = await supabase
    .from("check_ins")
    .select("id,place_id,verified,created_at")
    .eq("booking_id", booking.id)
    .eq("user_id", user.id);

  return jsonOk({
    booking,
    checkpoints: checkpoints ?? [],
    checkins: checkins ?? [],
  });
}

export async function PATCH(request: Request, context: Context) {
  const { bookingId } = await context.params;
  const supabase = await createClient();
  if (!supabase) {
    return jsonError(500, "missing_env", "Supabase env is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "unauthorized", "Unauthorized");
  }

  const parsed = BookingStatusUpdateInput.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid status payload", parsed.error.flatten());
  }
  const nextStatus = parsed.data.status;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,tourist_id,guide_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError || !booking) {
    return jsonError(404, "not_found", "Booking not found");
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  let allowed = false;
  if (profile?.role === "admin" || booking.tourist_id === user.id) {
    allowed = true;
  } else {
    const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
    if (guide?.id && guide.id === booking.guide_id) {
      allowed = true;
    }
  }
  if (!allowed) {
    return jsonError(403, "forbidden", "Forbidden");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId)
    .select("id,status")
    .single();
  if (error) {
    return jsonError(500, "db_error", error.message);
  }

  return jsonOk({ booking: data });
}
