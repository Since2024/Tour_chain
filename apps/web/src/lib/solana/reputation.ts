import { PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { getProvider, getProgram } from "./anchor";
import idl from "./idl/tourchain_reputation.json";

const PROGRAM_ID = new PublicKey(idl.address);

export function getGuidePda(guideAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guide"), guideAddress.toBuffer()],
    PROGRAM_ID
  );
}

export async function fetchGuideReputation(
  wallet: AnchorWallet,
  guideAddress: PublicKey
) {
  const provider = getProvider(wallet);
  const program = getProgram(idl as Record<string, unknown>, provider);
  const [pda] = getGuidePda(guideAddress);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (program.account as any).guideReputation.fetch(pda);
  } catch {
    return null;
  }
}
