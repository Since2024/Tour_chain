import { PublicKey } from "@solana/web3.js";
import idl from "./idl/tourchain_reputation.json";

const PROGRAM_ID = new PublicKey(idl.address);

export function getGuidePda(guideAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guide"), guideAddress.toBuffer()],
    PROGRAM_ID
  );
}
