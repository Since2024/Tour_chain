import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PublicKey } from "@solana/web3.js";

function getEscrowPda(
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): PublicKey {
  const ESCROW_PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ??
      "B1M6gHx7W2tKPWwEEuKaumyk2H8zdETZGoBCDt9yamrt"
  );
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(createdAt));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), tourist.toBuffer(), guide.toBuffer(), buf],
    ESCROW_PROGRAM_ID
  );
  return pda;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { service_id, milestones } = body;

  if (typeof service_id !== "string") {
    return NextResponse.json({ error: "service_id required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: svc } = await service
    .from("services")
    .select("id, price_usd, guide_id, guides(user_id, users(wallet_address))")
    .eq("id", service_id)
    .single();

  if (!svc) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { data: tourist } = await service
    .from("users")
    .select("wallet_address")
    .eq("id", user.id)
    .single();

  if (!tourist?.wallet_address) {
    return NextResponse.json(
      { error: "Link a Solana wallet before booking" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guideUser = (svc as any).guides?.users;
  if (!guideUser?.wallet_address) {
    return NextResponse.json(
      { error: "Guide has no linked wallet" },
      { status: 400 }
    );
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const touristPk = new PublicKey(tourist.wallet_address);
  const guidePk = new PublicKey(guideUser.wallet_address);
  const escrowPda = getEscrowPda(touristPk, guidePk, createdAt);

  const adminAddress =
    process.env.NEXT_PUBLIC_ADMIN_PUBKEY ??
    "11111111111111111111111111111111";

  return NextResponse.json({
    escrowPda: escrowPda.toBase58(),
    touristWallet: tourist.wallet_address,
    guideWallet: guideUser.wallet_address,
    adminWallet: adminAddress,
    amountLamports: Math.round(Number(svc.price_usd) * 1_000_000),
    milestones: milestones ?? 1,
    createdAt,
  });
}
