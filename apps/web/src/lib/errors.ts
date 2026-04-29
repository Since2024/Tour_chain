// Server-side AppError hierarchy — throw these inside API route handlers.
// The handle() wrapper in lib/api/handle.ts catches them and maps to HTTP responses.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ── Client-side wallet error classifier ─────────────────────────────────────
// Use this to give users specific feedback when Solana transactions fail.
export type WalletErrorType = "rejected" | "insufficient_funds" | "network" | "failed";

export function classifyWalletError(err: unknown): { type: WalletErrorType; message: string } {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();

  if (
    msg.includes("user rejected") ||
    msg.includes("user cancelled") ||
    msg.includes("wallet closed") ||
    msg.includes("aborted")
  ) {
    return { type: "rejected", message: "Transaction rejected by wallet" };
  }

  if (
    msg.includes("insufficient funds") ||
    msg.includes("not enough sol") ||
    msg.includes("insufficient lamports")
  ) {
    return { type: "insufficient_funds", message: "Insufficient SOL to complete transaction" };
  }

  if (
    msg.includes("network error") ||
    msg.includes("timeout") ||
    msg.includes("failed to fetch") ||
    msg.includes("econnreset")
  ) {
    return { type: "network", message: "Network error — check your connection and retry" };
  }

  return {
    type: "failed",
    message: err instanceof Error ? err.message : "Transaction failed",
  };
}
