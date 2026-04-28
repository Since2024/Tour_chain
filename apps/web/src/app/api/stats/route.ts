import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [touristsRes, proofsRes, bookingsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "tourist"),
      supabase
        .from("completion_proofs")
        .select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("total_price_usd"),
    ]);

    const totalEscrowUsd = (bookingsRes.data ?? []).reduce(
      (acc, row) => acc + Number(row.total_price_usd || 0),
      0,
    );

    return NextResponse.json({
      tourists: touristsRes.count ?? 0,
      nftsMinted: proofsRes.count ?? 0,
      proofs: proofsRes.count ?? 0,
      totalEscrowUsd,
    });
  } catch {
    return NextResponse.json(
      { tourists: 0, nftsMinted: 0, proofs: 0, totalEscrowUsd: 0 },
      { status: 200 },
    );
  }
}
