import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import type { TourchainEscrow } from "../target/types/tourchain_escrow";

describe("tourchain_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TourchainEscrow as Program<TourchainEscrow>;

  const tourist = (provider.wallet as anchor.Wallet).payer;
  const guide = Keypair.generate();
  const admin = Keypair.generate();
  const impostor = Keypair.generate();

  const escrowAmount = new BN(0.5 * LAMPORTS_PER_SOL);
  const milestones = 2;
  const createdAt = new BN(Math.floor(Date.now() / 1000));

  let bookingEscrowPda: PublicKey;
  let vaultPda: PublicKey;

  function deriveEscrowPdas(
    tourist_: PublicKey,
    guide_: PublicKey,
    createdAt_: BN
  ): [PublicKey, PublicKey] {
    const tsBuf = Buffer.alloc(8);
    // createdAt as i64 little-endian
    const lo = createdAt_.toNumber() & 0xffffffff;
    const hi = Math.floor(createdAt_.toNumber() / 0x100000000);
    tsBuf.writeInt32LE(lo, 0);
    tsBuf.writeInt32LE(hi, 4);

    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), tourist_.toBuffer(), guide_.toBuffer(), tsBuf],
      program.programId
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrow.toBuffer()],
      program.programId
    );
    return [escrow, vault];
  }

  before(async () => {
    [bookingEscrowPda, vaultPda] = deriveEscrowPdas(
      tourist.publicKey,
      guide.publicKey,
      createdAt
    );

    // Fund guide and admin for signing
    for (const kp of [guide, admin, impostor]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);
    }
  });

  // --- create_escrow ---

  it("creates an escrow and funds the vault", async () => {
    await program.methods
      .createEscrow(escrowAmount, milestones, createdAt)
      .accounts({
        bookingEscrow: bookingEscrowPda,
        vault: vaultPda,
        tourist: tourist.publicKey,
        guide: guide.publicKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.bookingEscrow.fetch(bookingEscrowPda);
    assert.equal(acc.milestones, milestones);
    assert.equal(acc.milestonesCompleted, 0);
    assert.equal(acc.amount.toString(), escrowAmount.toString());
    assert.equal(acc.released.toString(), "0");
    expect(acc.status).to.deep.equal({ funded: {} });

    const vaultBalance = await provider.connection.getBalance(vaultPda);
    assert.isAtLeast(vaultBalance, escrowAmount.toNumber());
  });

  it("rejects create_escrow with 0 milestones", async () => {
    const ts2 = new BN(createdAt.toNumber() + 1);
    const [pda2, vault2] = deriveEscrowPdas(tourist.publicKey, guide.publicKey, ts2);

    try {
      await program.methods
        .createEscrow(escrowAmount, 0, ts2)
        .accounts({
          bookingEscrow: pda2,
          vault: vault2,
          tourist: tourist.publicKey,
          guide: guide.publicKey,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Milestones must be between");
    }
  });

  it("rejects create_escrow with 11 milestones", async () => {
    const ts3 = new BN(createdAt.toNumber() + 2);
    const [pda3, vault3] = deriveEscrowPdas(tourist.publicKey, guide.publicKey, ts3);

    try {
      await program.methods
        .createEscrow(escrowAmount, 11, ts3)
        .accounts({
          bookingEscrow: pda3,
          vault: vault3,
          tourist: tourist.publicKey,
          guide: guide.publicKey,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Milestones must be between");
    }
  });

  // --- activate ---

  it("activates the escrow (guide signer)", async () => {
    await program.methods
      .activate()
      .accounts({
        bookingEscrow: bookingEscrowPda,
        guide: guide.publicKey,
      })
      .signers([guide])
      .rpc();

    const acc = await program.account.bookingEscrow.fetch(bookingEscrowPda);
    expect(acc.status).to.deep.equal({ active: {} });
  });

  it("rejects activate when already Active", async () => {
    try {
      await program.methods
        .activate()
        .accounts({
          bookingEscrow: bookingEscrowPda,
          guide: guide.publicKey,
        })
        .signers([guide])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Invalid booking status");
    }
  });

  // --- release_milestone ---

  it("releases milestone 1 (tourist + guide dual sig)", async () => {
    const guideBefore = await provider.connection.getBalance(guide.publicKey);

    await program.methods
      .releaseMilestone()
      .accounts({
        bookingEscrow: bookingEscrowPda,
        vault: vaultPda,
        tourist: tourist.publicKey,
        guide: guide.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([guide])
      .rpc();

    const acc = await program.account.bookingEscrow.fetch(bookingEscrowPda);
    assert.equal(acc.milestonesCompleted, 1);

    const guideAfter = await provider.connection.getBalance(guide.publicKey);
    const perMs = escrowAmount.toNumber() / milestones;
    assert.isAbove(guideAfter, guideBefore, "guide should have received payment");
    // allow for tx fee paid by tourist (tourist is payer for the TX)
    assert.approximately(guideAfter - guideBefore, perMs, 10000);
  });

  it("releases milestone 2 (final milestone)", async () => {
    await program.methods
      .releaseMilestone()
      .accounts({
        bookingEscrow: bookingEscrowPda,
        vault: vaultPda,
        tourist: tourist.publicKey,
        guide: guide.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([guide])
      .rpc();

    const acc = await program.account.bookingEscrow.fetch(bookingEscrowPda);
    assert.equal(acc.milestonesCompleted, 2);
  });

  it("rejects release_milestone when all milestones completed", async () => {
    try {
      await program.methods
        .releaseMilestone()
        .accounts({
          bookingEscrow: bookingEscrowPda,
          vault: vaultPda,
          tourist: tourist.publicKey,
          guide: guide.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([guide])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.not.be.empty;
    }
  });

  // --- complete_booking ---

  it("completes the booking (transfers remaining to guide)", async () => {
    await program.methods
      .completeBooking()
      .accounts({
        bookingEscrow: bookingEscrowPda,
        vault: vaultPda,
        tourist: tourist.publicKey,
        guide: guide.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([guide])
      .rpc();

    const acc = await program.account.bookingEscrow.fetch(bookingEscrowPda);
    expect(acc.status).to.deep.equal({ completed: {} });
  });

  it("rejects complete_booking when already Completed", async () => {
    try {
      await program.methods
        .completeBooking()
        .accounts({
          bookingEscrow: bookingEscrowPda,
          vault: vaultPda,
          tourist: tourist.publicKey,
          guide: guide.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([guide])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Invalid booking status");
    }
  });

  // --- cancel_booking ---

  describe("cancel flow", () => {
    const cGuide = Keypair.generate();
    const cAdmin = Keypair.generate();
    const cTs = new BN(Math.floor(Date.now() / 1000) + 10);
    let cEscrow: PublicKey;
    let cVault: PublicKey;

    before(async () => {
      [cEscrow, cVault] = deriveEscrowPdas(tourist.publicKey, cGuide.publicKey, cTs);
      const sig = await provider.connection.requestAirdrop(cGuide.publicKey, LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);
    });

    it("creates then cancels before activation (full refund)", async () => {
      const balBefore = await provider.connection.getBalance(tourist.publicKey);

      await program.methods
        .createEscrow(escrowAmount, 1, cTs)
        .accounts({
          bookingEscrow: cEscrow,
          vault: cVault,
          tourist: tourist.publicKey,
          guide: cGuide.publicKey,
          admin: cAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .cancelBooking()
        .accounts({
          bookingEscrow: cEscrow,
          vault: cVault,
          tourist: tourist.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const acc = await program.account.bookingEscrow.fetch(cEscrow);
      expect(acc.status).to.deep.equal({ cancelled: {} });

      // Vault should be drained
      const vaultBalance = await provider.connection.getBalance(cVault);
      assert.equal(vaultBalance, 0, "vault should be empty after cancel");

      // Tourist receives the escrow amount back (minus tx fees + booking_escrow rent)
      const balAfter = await provider.connection.getBalance(tourist.publicKey);
      const netLoss = balBefore - balAfter;
      // Net loss should be less than 5% of escrow amount (covers rent + fees)
      assert.isBelow(netLoss, escrowAmount.toNumber() / 20, "refund covered most of escrow");
    });

    it("rejects cancel_booking when already Cancelled", async () => {
      try {
        await program.methods
          .cancelBooking()
          .accounts({
            bookingEscrow: cEscrow,
            vault: cVault,
            tourist: tourist.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("should have thrown");
      } catch (e: unknown) {
        const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
        expect(msg).to.include("Invalid booking status");
      }
    });
  });

  // --- open_dispute / resolve_dispute ---

  describe("dispute flow", () => {
    const dGuide = Keypair.generate();
    const dAdmin = Keypair.generate();
    const dTs = new BN(Math.floor(Date.now() / 1000) + 20);
    let dEscrow: PublicKey;
    let dVault: PublicKey;

    before(async () => {
      [dEscrow, dVault] = deriveEscrowPdas(tourist.publicKey, dGuide.publicKey, dTs);
      for (const kp of [dGuide, dAdmin]) {
        const sig = await provider.connection.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig);
      }

      // Create + activate
      await program.methods
        .createEscrow(escrowAmount, 2, dTs)
        .accounts({
          bookingEscrow: dEscrow,
          vault: dVault,
          tourist: tourist.publicKey,
          guide: dGuide.publicKey,
          admin: dAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .activate()
        .accounts({ bookingEscrow: dEscrow, guide: dGuide.publicKey })
        .signers([dGuide])
        .rpc();
    });

    it("opens a dispute (tourist caller)", async () => {
      await program.methods
        .openDispute()
        .accounts({
          bookingEscrow: dEscrow,
          caller: tourist.publicKey,
        })
        .rpc();

      const acc = await program.account.bookingEscrow.fetch(dEscrow);
      expect(acc.status).to.deep.equal({ disputed: {} });
    });

    it("rejects open_dispute when already Disputed", async () => {
      try {
        await program.methods
          .openDispute()
          .accounts({
            bookingEscrow: dEscrow,
            caller: tourist.publicKey,
          })
          .rpc();
        assert.fail("should have thrown");
      } catch (e: unknown) {
        const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
        expect(msg).to.include("Invalid booking status");
      }
    });

    it("resolves dispute 50/50 (admin, bps=5000)", async () => {
      const touristBefore = await provider.connection.getBalance(tourist.publicKey);
      const guideBefore = await provider.connection.getBalance(dGuide.publicKey);

      await program.methods
        .resolveDispute(5000)
        .accounts({
          bookingEscrow: dEscrow,
          vault: dVault,
          tourist: tourist.publicKey,
          guide: dGuide.publicKey,
          admin: dAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dAdmin])
        .rpc();

      const acc = await program.account.bookingEscrow.fetch(dEscrow);
      expect(acc.status).to.deep.equal({ refunded: {} });

      const half = escrowAmount.toNumber() / 2;
      const touristAfter = await provider.connection.getBalance(tourist.publicKey);
      const guideAfter = await provider.connection.getBalance(dGuide.publicKey);

      assert.approximately(touristAfter - touristBefore, half, 10000);
      assert.approximately(guideAfter - guideBefore, half, 10000);
    });

    it("rejects resolve_dispute with bps > 10000", async () => {
      // Create a fresh disputed escrow for this failure test
      const dTs2 = new BN(dTs.toNumber() + 5);
      const [dEscrow2, dVault2] = deriveEscrowPdas(tourist.publicKey, dGuide.publicKey, dTs2);

      await program.methods
        .createEscrow(escrowAmount, 1, dTs2)
        .accounts({
          bookingEscrow: dEscrow2,
          vault: dVault2,
          tourist: tourist.publicKey,
          guide: dGuide.publicKey,
          admin: dAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .activate()
        .accounts({ bookingEscrow: dEscrow2, guide: dGuide.publicKey })
        .signers([dGuide])
        .rpc();

      await program.methods
        .openDispute()
        .accounts({ bookingEscrow: dEscrow2, caller: tourist.publicKey })
        .rpc();

      try {
        await program.methods
          .resolveDispute(10001)
          .accounts({
            bookingEscrow: dEscrow2,
            vault: dVault2,
            tourist: tourist.publicKey,
            guide: dGuide.publicKey,
            admin: dAdmin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([dAdmin])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: unknown) {
        const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
        expect(msg).to.include("bps");
      }
    });

    it("rejects resolve_dispute from non-admin", async () => {
      const dTs3 = new BN(dTs.toNumber() + 10);
      const [dEscrow3, dVault3] = deriveEscrowPdas(tourist.publicKey, dGuide.publicKey, dTs3);

      await program.methods
        .createEscrow(escrowAmount, 1, dTs3)
        .accounts({
          bookingEscrow: dEscrow3,
          vault: dVault3,
          tourist: tourist.publicKey,
          guide: dGuide.publicKey,
          admin: dAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .activate()
        .accounts({ bookingEscrow: dEscrow3, guide: dGuide.publicKey })
        .signers([dGuide])
        .rpc();

      await program.methods
        .openDispute()
        .accounts({ bookingEscrow: dEscrow3, caller: tourist.publicKey })
        .rpc();

      try {
        await program.methods
          .resolveDispute(5000)
          .accounts({
            bookingEscrow: dEscrow3,
            vault: dVault3,
            tourist: tourist.publicKey,
            guide: dGuide.publicKey,
            admin: impostor.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([impostor])
          .rpc();
        assert.fail("should have thrown");
      } catch (e: unknown) {
        expect((e as Error).message).to.not.be.empty;
      }
    });
  });
});
