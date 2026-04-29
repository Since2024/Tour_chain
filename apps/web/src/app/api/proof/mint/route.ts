import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import bs58 from "bs58";
import idl from "@/lib/solana/idl/tourchain_proof.json";
import { env } from "@/lib/env";
import { handle, rateLimit } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { ProofMintInput } from "@/lib/validation/schemas";

const PROOF_PROGRAM_ID = new PublicKey(idl.address);

function getPlatformKeypair(): Keypair {
  if (!env.SOLANA_PLATFORM_KEYPAIR)
    throw new Error("SOLANA_PLATFORM_KEYPAIR env var is required");
  return Keypair.fromSecretKey(bs58.decode(env.SOLANA_PLATFORM_KEYPAIR));
}

function getProofAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proof_authority")],
    PROOF_PROGRAM_ID
  );
}

export const POST = handle(ProofMintInput, async (body) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  // 60 requests/min (admin-only, but still guard against runaway scripts)
  if (!rateLimit(`proof-mint:${user.id}`, 60, 60_000)) {
    return jsonError(429, "rate_limited", "Too many requests — try again in a minute");
  }

  const service = createServiceClient();
  const { data: dbUser } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "admin") return jsonError(403, "forbidden", "Admin only");

  const keypair = getPlatformKeypair();
  const connection = new Connection(env.NEXT_PUBLIC_SOLANA_RPC, "confirmed");

  const anchorWallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => { tx.partialSign(keypair); return tx; },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach((tx) => tx.partialSign(keypair));
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, anchorWallet as AnchorProvider["wallet"], {
    commitment: "confirmed",
  });

  const program = new Program(idl as Record<string, unknown>, provider);
  const [proofAuthority] = getProofAuthorityPda();

  const merkleTreeAddress = env.NEXT_PUBLIC_MERKLE_TREE;
  if (!merkleTreeAddress) {
    return jsonError(500, "misconfigured", "NEXT_PUBLIC_MERKLE_TREE not configured");
  }

  const merkleTree = new PublicKey(merkleTreeAddress);

  const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
  const SPL_NOOP_PROGRAM_ID = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
  const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KBNCa");

  const [treeConfig] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );

  const leafOwnerPk = new PublicKey(body.leaf_owner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txSig = await (program.methods as any)
    .mintCompletionProof(body.name, body.symbol, body.uri)
    .accounts({
      proofAuthority,
      admin: keypair.publicKey,
      treeConfig,
      leafOwner: leafOwnerPk,
      leafDelegate: leafOwnerPk,
      merkleTree,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const { data: booking } = await service
    .from("bookings")
    .select("tourist_id, route_id")
    .eq("id", body.bookingId)
    .single();

  await service.from("completion_proofs").insert({
    booking_id: body.bookingId,
    user_id: booking?.tourist_id ?? user.id,
    route_id: booking?.route_id ?? null,
    mint_tx_signature: txSig,
    metadata_uri: body.uri,
  });

  return jsonOk({ txSignature: txSig });
});
