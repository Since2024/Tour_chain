import { linkWallet } from "@/lib/auth/wallet";
import { createClient } from "@/lib/supabase/server";
import { handle, rateLimit, clientIp } from "@/lib/api/handle";
import { jsonError, jsonOk } from "@/lib/api/response";
import { WalletLinkInput } from "@/lib/validation/schemas";

const usedNonces = new Set<string>();

export const POST = handle(WalletLinkInput, async (body, req) => {
  // 5 requests/min per IP (before auth to block brute-force)
  if (!rateLimit(`link-wallet:${clientIp(req)}`, 5, 60_000)) {
    return jsonError(429, "rate_limited", "Too many requests — try again in a minute");
  }

  if (usedNonces.has(body.nonce)) {
    return jsonError(400, "nonce_reused", "Nonce already used");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError(401, "unauthorized", "Unauthorized");

  const { error } = await linkWallet(user.id, body.walletAddress, body.signature, body.nonce);
  if (error) {
    return jsonError(400, "link_failed", typeof error === "string" ? error : "Failed to link wallet");
  }

  usedNonces.add(body.nonce);
  if (usedNonces.size > 5_000) usedNonces.clear();

  return jsonOk({ ok: true });
});
