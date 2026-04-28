import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export function getProvider(wallet: WalletContextState) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
  const connection = new Connection(endpoint, "confirmed");
  return new AnchorProvider(connection, wallet as unknown as AnchorProvider["wallet"], {
    commitment: "confirmed",
  });
}

export function getProgram<T extends Idl>(
  idl: T,
  programId: string,
  provider: AnchorProvider,
) {
  // Anchor v0.30+ expects the program address to be present on the IDL.
  const idlWithAddress = { ...(idl as object), address: new PublicKey(programId) } as T & {
    address: PublicKey;
  };
  return new Program(idlWithAddress, provider);
}
