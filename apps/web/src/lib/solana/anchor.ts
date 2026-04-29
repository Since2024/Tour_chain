import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { publicEnv } from "@/lib/env";

export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const endpoint = publicEnv.NEXT_PUBLIC_SOLANA_RPC;
  const connection = new Connection(endpoint, "confirmed");
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(idl: Record<string, unknown>, provider: AnchorProvider): Program<any> {
  return new Program(idl as unknown as Idl, provider);
}
