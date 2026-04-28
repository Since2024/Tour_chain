import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/api/response";
import { BookingCreateInput } from "@/lib/validation/schemas";

type IdName = { id: string; name?: string };
type IdTitle = { id: string; title?: string };
type BookingRowUsd = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  total_price_usd: number;
  route_id?: string | null;
  service_id: string;
};
type BookingRowAlt = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  total_price: number;
  route_id?: string | null;
  service_id: string;
};
type BookingRowSol = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  amount_sol: number;
  route_id?: string | null;
  service_id: string;
};

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return jsonError(401, "unauthorized", "Supabase is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "unauthorized", "You must be logged in to view bookings");
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();

  // Avoid PostgREST relationship cache dependency by not using nested selects.
  // Support multiple schema variants for booking amount columns.
  const buildQuery = (
    priceColumn: "total_price_usd" | "total_price" | "amount_sol",
    withRouteId = true,
  ) =>
    supabase
      .from("bookings")
      .select(`id,status,start_date,end_date,${priceColumn}${withRouteId ? ",route_id" : ""},service_id`)
      .order("created_at", { ascending: false });

  let query = buildQuery("total_price_usd");

  if (profile?.role === "guide") {
    const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
    if (!guide?.id) {
      return jsonOk({ bookings: [] });
    }
    query = query.eq("guide_id", guide.id);
  } else if (profile?.role !== "admin") {
    query = query.eq("tourist_id", user.id);
  }

  let { data, error } = await query;
  if (error?.message?.includes("total_price_usd") && error.message.includes("does not exist")) {
    // Retry against alternate column name.
    let query2 = buildQuery("total_price");
    if (profile?.role === "guide") {
      const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
      if (!guide?.id) {
        return jsonOk({ bookings: [] });
      }
      query2 = query2.eq("guide_id", guide.id);
    } else if (profile?.role !== "admin") {
      query2 = query2.eq("tourist_id", user.id);
    }
    const retry = await query2;
    data = retry.data;
    error = retry.error;
  }
  if (error?.message?.includes("total_price") && error.message.includes("does not exist")) {
    let query3 = buildQuery("amount_sol");
    if (profile?.role === "guide") {
      const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
      if (!guide?.id) {
        return jsonOk({ bookings: [] });
      }
      query3 = query3.eq("guide_id", guide.id);
    } else if (profile?.role !== "admin") {
      query3 = query3.eq("tourist_id", user.id);
    }
    const retry = await query3;
    data = retry.data;
    error = retry.error;
  }
  if (error?.message?.includes("route_id") && error.message.includes("does not exist")) {
    let query3 = buildQuery("total_price_usd", false);
    if (profile?.role === "guide") {
      const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
      if (!guide?.id) {
        return jsonOk({ bookings: [] });
      }
      query3 = query3.eq("guide_id", guide.id);
    } else if (profile?.role !== "admin") {
      query3 = query3.eq("tourist_id", user.id);
    }
    const retry = await query3;
    data = retry.data;
    error = retry.error;
    if (error?.message?.includes("total_price_usd") && error.message.includes("does not exist")) {
      let query4 = buildQuery("total_price", false);
      if (profile?.role === "guide") {
        const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
        if (!guide?.id) {
          return jsonOk({ bookings: [] });
        }
        query4 = query4.eq("guide_id", guide.id);
      } else if (profile?.role !== "admin") {
        query4 = query4.eq("tourist_id", user.id);
      }
      const retry2 = await query4;
      data = retry2.data;
      error = retry2.error;
      if (error?.message?.includes("total_price") && error.message.includes("does not exist")) {
        let query5 = buildQuery("amount_sol", false);
        if (profile?.role === "guide") {
          const { data: guide } = await supabase.from("guides").select("id").eq("user_id", user.id).maybeSingle();
          if (!guide?.id) {
            return jsonOk({ bookings: [] });
          }
          query5 = query5.eq("guide_id", guide.id);
        } else if (profile?.role !== "admin") {
          query5 = query5.eq("tourist_id", user.id);
        }
        const retry3 = await query5;
        data = retry3.data;
        error = retry3.error;
      }
    }
  }

  if (error) {
    return jsonError(500, "db_error", error.message);
  }

  const rows = (data ?? []) as unknown as Array<BookingRowUsd | BookingRowAlt | BookingRowSol>;
  const bookings = rows.map((row) => ({
    id: row.id,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    total_price_usd:
      "total_price_usd" in row
        ? row.total_price_usd
        : "total_price" in row
          ? row.total_price
          : row.amount_sol,
    route_id: row.route_id ?? null,
    service_id: row.service_id,
  }));

  const routeIds = Array.from(new Set(bookings.map((b) => b.route_id).filter(Boolean))) as string[];
  const serviceIds = Array.from(new Set(bookings.map((b) => b.service_id).filter(Boolean))) as string[];

  const [routesRes, servicesRes] = await Promise.all([
    routeIds.length
      ? supabase.from("routes").select("id,name").in("id", routeIds)
      : Promise.resolve({ data: [] as IdName[], error: null as unknown }),
    serviceIds.length
      ? supabase.from("services").select("id,title").in("id", serviceIds)
      : Promise.resolve({ data: [] as IdTitle[], error: null as unknown }),
  ]);

  if (routesRes.error) return jsonError(500, "db_error", "Failed to load routes", routesRes.error);
  if (servicesRes.error) return jsonError(500, "db_error", "Failed to load services", servicesRes.error);

  const routeById = new Map((routesRes.data ?? []).map((r) => [r.id, r]));
  const serviceById = new Map((servicesRes.data ?? []).map((s) => [s.id, s]));

  const hydrated = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    start_date: b.start_date,
    end_date: b.end_date,
    total_price_usd: b.total_price_usd,
    route: b.route_id ? { name: routeById.get(b.route_id)?.name } : null,
    service: b.service_id ? { title: serviceById.get(b.service_id)?.title } : null,
  }));

  return jsonOk({ bookings: hydrated });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return jsonError(500, "missing_env", "Supabase env is not configured");
  }

  const parsed = BookingCreateInput.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid booking payload", parsed.error.flatten());
  }
  const body = parsed.data;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonError(401, "unauthorized", "Unauthorized");
  }

  const baseInsert = {
    tourist_id: user.id,
    guide_id: body.guideId,
    service_id: body.serviceId,
    status: "confirmed",
    start_date: body.startDate,
    end_date: body.endDate ?? null,
  };

  const attempts: Array<{
    insert: Record<string, unknown>;
    select: string;
  }> = [
    {
      insert: { ...baseInsert, route_id: body.routeId ?? null, milestones_total: body.milestonesTotal ?? 1, total_price_usd: body.totalPriceUsd },
      select: "id,status,start_date,total_price_usd",
    },
    {
      insert: { ...baseInsert, route_id: body.routeId ?? null, milestones_total: body.milestonesTotal ?? 1, total_price: body.totalPriceUsd },
      select: "id,status,start_date,total_price",
    },
    {
      insert: { ...baseInsert, route_id: body.routeId ?? null, total_price_usd: body.totalPriceUsd },
      select: "id,status,start_date,total_price_usd",
    },
    {
      insert: { ...baseInsert, route_id: body.routeId ?? null, total_price: body.totalPriceUsd },
      select: "id,status,start_date,total_price",
    },
    {
      insert: { ...baseInsert, milestones_total: body.milestonesTotal ?? 1, total_price_usd: body.totalPriceUsd },
      select: "id,status,start_date,total_price_usd",
    },
    {
      insert: { ...baseInsert, milestones_total: body.milestonesTotal ?? 1, total_price: body.totalPriceUsd },
      select: "id,status,start_date,total_price",
    },
    {
      insert: { ...baseInsert, total_price_usd: body.totalPriceUsd },
      select: "id,status,start_date,total_price_usd",
    },
    {
      insert: { ...baseInsert, total_price: body.totalPriceUsd },
      select: "id,status,start_date,total_price",
    },
    {
      insert: { ...baseInsert, route_id: body.routeId ?? null, amount_sol: body.totalPriceUsd },
      select: "id,status,start_date,amount_sol",
    },
    {
      insert: { ...baseInsert, amount_sol: body.totalPriceUsd },
      select: "id,status,start_date,amount_sol",
    },
  ];

  let insertRes:
    | {
        data: { id: string; status: string; start_date: string; total_price_usd?: number; total_price?: number; amount_sol?: number } | null;
        error: { message: string } | null;
      }
    | null = null;

  for (const attempt of attempts) {
    const current = await supabase.from("bookings").insert(attempt.insert).select(attempt.select).single();
    if (!current.error) {
      insertRes = {
        data: current.data as unknown as {
          id: string;
          status: string;
          start_date: string;
          total_price_usd?: number;
          total_price?: number;
          amount_sol?: number;
        },
        error: null,
      };
      break;
    }
    insertRes = { data: null, error: { message: current.error.message } };
  }

  if (!insertRes || insertRes.error || !insertRes.data) {
    const message = insertRes?.error?.message ?? "Failed to create booking";
    const looksLikeRls = /row-level security policy/i.test(message);
    if (!looksLikeRls) {
      return jsonError(500, "db_error", message);
    }

    const admin = createAdminClient();
    if (!admin) {
      return jsonError(500, "db_error", message);
    }

    // Resolve tourist_id across schema variants:
    // - users.id == auth user id
    // - users.auth_id == auth user id
    // If missing, create a compatible users row.
    let touristId = user.id;
    const byId = await admin.from("users").select("id").eq("id", user.id).maybeSingle();
    if (byId.data?.id) {
      touristId = byId.data.id;
    } else {
      const byAuth = await admin.from("users").select("id").eq("auth_id", user.id).maybeSingle();
      if (byAuth.data?.id) {
        touristId = byAuth.data.id;
      } else {
        const displayName = user.email?.split("@")[0] ?? "Traveler";
        const createAttempts: Array<Record<string, unknown>> = [
          { id: user.id, auth_id: user.id, email: user.email ?? null, display_name: displayName, role: "tourist" },
          { id: crypto.randomUUID(), auth_id: user.id, email: user.email ?? null, display_name: displayName, role: "tourist" },
        ];
        for (const payload of createAttempts) {
          const created = await admin.from("users").insert(payload).select("id").maybeSingle();
          if (!created.error && created.data?.id) {
            touristId = created.data.id;
            break;
          }
        }
        const ensure = await admin.from("users").select("id").eq("auth_id", user.id).maybeSingle();
        if (ensure.data?.id) touristId = ensure.data.id;
      }
    }

    for (const attempt of attempts) {
      const payload = { ...attempt.insert, tourist_id: touristId };
      const current = await admin.from("bookings").insert(payload).select(attempt.select).single();
      if (!current.error) {
        insertRes = {
          data: current.data as unknown as {
            id: string;
            status: string;
            start_date: string;
            total_price_usd?: number;
            total_price?: number;
            amount_sol?: number;
          },
          error: null,
        };
        break;
      }
      insertRes = { data: null, error: { message: current.error.message } };
    }
    if (!insertRes || insertRes.error || !insertRes.data) {
      return jsonError(500, "db_error", insertRes?.error?.message ?? message);
    }
  }

  const booking = insertRes.data;
  return jsonOk(
    {
      booking: {
        id: booking.id,
        status: booking.status,
        start_date: booking.start_date,
        total_price_usd: booking.total_price_usd ?? booking.total_price ?? booking.amount_sol ?? body.totalPriceUsd,
      },
    },
    { status: 201 },
  );
}
