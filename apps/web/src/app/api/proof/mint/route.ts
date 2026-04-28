import { NextRequest, NextResponse } from "next/server";
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

const PROOF_PROGRAM_ID = new PublicKey(idl.address);

function getPlatformKeypair(): Keypair {
  const raw = process.env.SOLANA_PLATFORM_KEYPAIR;
  if (!raw) throw new Error("SOLANA_PLATFORM_KEYPAIR env var is required");
  return Keypair.fromSecretKey(bs58.decode(raw));
}

function getProofAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proof_authority")],
    PROOF_PROGRAM_ID
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: dbUser } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { booking_id, leaf_owner, name, symbol, uri } = body;

  if (
    typeof booking_id !== "string" ||
    typeof leaf_owner !== "string" ||
    typeof name !== "string" ||
    typeof symbol !== "string" ||
    typeof uri !== "string"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const keypair = getPlatformKeypair();
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com",
      "confirmed"
    );

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

    const merkleTreeAddress = process.env.NEXT_PUBLIC_MERKLE_TREE;
    if (!merkleTreeAddress) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_MERKLE_TREE not configured" },
        { status: 500 }
      );
    }

    const merkleTree = new PublicKey(merkleTreeAddress);

    const BUBBLEGUM_PROGRAM_ID = new PublicKey(
      "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
    );
    const SPL_NOOP_PROGRAM_ID = new PublicKey(
      "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"
    );
    const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey(
      "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KBNCa"
    );

    // Derive tree config PDA (Bubblegum)
    const [treeConfig] = PublicKey.findProgramAddressSync(
      [merkleTree.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    const leafOwnerPk = new PublicKey(leaf_owner);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txSig = await (program.methods as any)
      .mintCompletionProof(name, symbol, uri)
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

    // Record in DB
    const { data: booking } = await service
      .from("bookings")
      .select("tourist_id, route_id")
      .eq("id", booking_id)
      .single();

    await service.from("completion_proofs").insert({
      booking_id,
      user_id: booking?.tourist_id ?? user.id,
      route_id: booking?.route_id ?? null,
      mint_tx_signature: txSig,
      metadata_uri: uri,
    });

    return NextResponse.json({ txSignature: txSig });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
