import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PublicKey } from "@solana/web3.js";
import { env } from "@/lib/env";
import { handle, rateLimit } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { BookingPrepareInput } from "@/lib/validation/schemas";
import idl from "@/lib/solana/idl/tourchain_escrow.json";

function getEscrowPda(
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): PublicKey {
  const ESCROW_PROGRAM_ID = new PublicKey(
    env.NEXT_PUBLIC_ESCROW_PROGRAM_ID ?? idl.address
  );
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(createdAt));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), tourist.toBuffer(), guide.toBuffer(), buf],
    ESCROW_PROGRAM_ID
  );
  return pda;
}

export const POST = handle(BookingPrepareInput, async (body, req) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  // 20 requests/min per user
  if (!rateLimit(`booking-prepare:${user.id}`, 20, 60_000)) {
    return jsonError(429, "rate_limited", "Too many requests — try again in a minute");
  }

  const service = createServiceClient();

  const { data: svc } = await service
    .from("services")
    .select("id, price_usd, guide_id, guides(user_id, users(wallet_address))")
    .eq("id", body.service_id)
    .single();

  if (!svc) return jsonError(404, "not_found", "Service not found");

  const { data: tourist } = await service
    .from("users")
    .select("wallet_address")
    .eq("id", user.id)
    .single();

  if (!tourist?.wallet_address) {
    return jsonError(400, "no_wallet", "Link a Solana wallet before booking");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guideUser = (svc as any).guides?.users;
  if (!guideUser?.wallet_address) {
    return jsonError(400, "guide_no_wallet", "Guide has no linked wallet");
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const touristPk = new PublicKey(tourist.wallet_address);
  const guidePk = new PublicKey(guideUser.wallet_address);
  const escrowPda = getEscrowPda(touristPk, guidePk, createdAt);

  return jsonOk({
    escrowPda: escrowPda.toBase58(),
    touristWallet: tourist.wallet_address,
    guideWallet: guideUser.wallet_address,
    adminWallet: env.NEXT_PUBLIC_ADMIN_PUBKEY ?? "11111111111111111111111111111111",
    amountLamports: Math.round(Number(svc.price_usd) * 1_000_000),
    milestones: body.milestones ?? 1,
    createdAt,
  });
});
