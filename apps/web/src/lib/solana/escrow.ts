import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { getProvider, getProgram } from "./anchor";
import idl from "./idl/tourchain_escrow.json";

const PROGRAM_ID = new PublicKey(idl.address);

export function getEscrowPda(
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): [PublicKey, number] {
  // Seeds: [b"escrow", tourist, guide, created_at.to_le_bytes()]
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(createdAt));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), tourist.toBuffer(), guide.toBuffer(), buf],
    PROGRAM_ID
  );
}

export function getVaultPda(escrowPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowPda.toBuffer()],
    PROGRAM_ID
  );
}

export async function createEscrow(
  wallet: AnchorWallet,
  guide: PublicKey,
  admin: PublicKey,
  amountLamports: BN,
  milestones: number,
  createdAt: number
): Promise<string> {
  const provider = getProvider(wallet);
  const program = getProgram(idl as Record<string, unknown>, provider);
  const tourist = provider.wallet.publicKey;
  const [escrowPda] = getEscrowPda(tourist, guide, createdAt);
  const [vaultPda] = getVaultPda(escrowPda);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .createEscrow(amountLamports, milestones, new BN(createdAt))
    .accounts({
      bookingEscrow: escrowPda,
      vault: vaultPda,
      tourist,
      guide,
      admin,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function releaseMilestone(
  wallet: AnchorWallet,
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): Promise<string> {
  const provider = getProvider(wallet);
  const program = getProgram(idl as Record<string, unknown>, provider);
  const [escrowPda] = getEscrowPda(tourist, guide, createdAt);
  const [vaultPda] = getVaultPda(escrowPda);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .releaseMilestone()
    .accounts({
      bookingEscrow: escrowPda,
      vault: vaultPda,
      tourist,
      guide,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function completeBooking(
  wallet: AnchorWallet,
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): Promise<string> {
  const provider = getProvider(wallet);
  const program = getProgram(idl as Record<string, unknown>, provider);
  const [escrowPda] = getEscrowPda(tourist, guide, createdAt);
  const [vaultPda] = getVaultPda(escrowPda);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .completeBooking()
    .accounts({
      bookingEscrow: escrowPda,
      vault: vaultPda,
      tourist,
      guide,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function cancelBooking(
  wallet: AnchorWallet,
  tourist: PublicKey,
  guide: PublicKey,
  createdAt: number
): Promise<string> {
  const provider = getProvider(wallet);
  const program = getProgram(idl as Record<string, unknown>, provider);
  const [escrowPda] = getEscrowPda(tourist, guide, createdAt);
  const [vaultPda] = getVaultPda(escrowPda);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .cancelBooking()
    .accounts({
      bookingEscrow: escrowPda,
      vault: vaultPda,
      tourist,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
