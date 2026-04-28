import bs58 from "bs58";
import nacl from "tweetnacl";
import { createClient as createServerClient } from "@/lib/supabase/server";

const NONCE_MAX_AGE_MS = 5 * 60 * 1000;

export function buildSignMessage(nonce: string, walletAddress: string): string {
  return `TourChain: link wallet ${walletAddress} at ${nonce}`;
}

export function verifyWalletSignature(
  message: string,
  signatureBase58: string,
  walletAddress: string,
): boolean {
  try {
    const msg = new TextEncoder().encode(message);
    const signature = bs58.decode(signatureBase58);
    const pubkey = bs58.decode(walletAddress);
    return nacl.sign.detached.verify(msg, signature, pubkey);
  } catch {
    return false;
  }
}

export function isNonceFresh(nonce: string): boolean {
  const timestamp = Number.parseInt(nonce.split(":")[0] ?? "", 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  return Math.abs(Date.now() - timestamp) <= NONCE_MAX_AGE_MS;
}

export async function linkWallet(
  userId: string,
  walletAddress: string,
  signatureBase58: string,
  nonce: string,
) {
  if (!isNonceFresh(nonce)) {
    return { error: "Nonce expired" };
  }

  const message = buildSignMessage(nonce, walletAddress);
  const isValid = verifyWalletSignature(message, signatureBase58, walletAddress);
  if (!isValid) {
    return { error: "Invalid wallet signature" };
  }

  const supabase = await createServerClient();
  if (!supabase) {
    return { error: "Supabase env is not configured" };
  }
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }
  if (existing && existing.id !== userId) {
    return { error: "Wallet already linked to another account" };
  }

  const { error } = await supabase.from("users").update({ wallet_address: walletAddress }).eq("id", userId);
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
