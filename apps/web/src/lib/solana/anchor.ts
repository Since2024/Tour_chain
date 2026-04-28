import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
  const connection = new Connection(endpoint, "confirmed");
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(idl: Record<string, unknown>, provider: AnchorProvider): Program<any> {
  return new Program(idl as unknown as Idl, provider);
}
