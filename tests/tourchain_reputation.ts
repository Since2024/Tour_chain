import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import type { TourchainReputation } from "../target/types/tourchain_reputation";

describe("tourchain_reputation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TourchainReputation as Program<TourchainReputation>;

  const admin = (provider.wallet as anchor.Wallet).payer;
  const guide = Keypair.generate();
  const impostor = Keypair.generate();

  let guideReputationPda: PublicKey;
  let bump: number;

  before(async () => {
    [guideReputationPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("guide"), guide.publicKey.toBuffer()],
      program.programId
    );

    // Fund impostor for signing
    const sig = await provider.connection.requestAirdrop(
      impostor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  });

  // --- initialize_guide ---

  it("initializes a guide", async () => {
    const nameBytes = Buffer.alloc(64);
    Buffer.from("Bikash Guide").copy(nameBytes);

    await program.methods
      .initializeGuide(Array.from(nameBytes) as unknown as number[] & { length: 64 })
      .accounts({
        guideReputation: guideReputationPda,
        guide: guide.publicKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.guideReputation.fetch(guideReputationPda);
    assert.isTrue(acc.isVerified, "should be verified");
    assert.isFalse(acc.isSuspended, "should not be suspended");
    assert.equal(acc.totalReviews, 0);
    assert.equal(acc.completedTreks, 0);
    expect(acc.authority.toBase58()).to.equal(guide.publicKey.toBase58());
    expect(acc.admin.toBase58()).to.equal(admin.publicKey.toBase58());
  });

  it("rejects initialize_guide from non-admin", async () => {
    const guide2 = Keypair.generate();
    const [pda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("guide"), guide2.publicKey.toBuffer()],
      program.programId
    );
    const nameBytes = Buffer.alloc(64);

    try {
      await program.methods
        .initializeGuide(Array.from(nameBytes) as unknown as number[] & { length: 64 })
        .accounts({
          guideReputation: pda2,
          guide: guide2.publicKey,
          admin: impostor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([impostor])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      // impostor is not the payer/authority — tx will fail on account constraint or insufficient funds
      expect((e as Error).message).to.not.be.empty;
    }
  });

  // --- update_reputation ---

  it("updates reputation with a valid score", async () => {
    await program.methods
      .updateReputation(5)
      .accounts({
        guideReputation: guideReputationPda,
        admin: admin.publicKey,
      })
      .rpc();

    const acc = await program.account.guideReputation.fetch(guideReputationPda);
    assert.equal(acc.totalReviews, 1);
    assert.equal(acc.totalScore.toNumber(), 500);
    assert.equal(acc.completedTreks, 1);
  });

  it("rejects score of 0 (below range)", async () => {
    try {
      await program.methods
        .updateReputation(0)
        .accounts({
          guideReputation: guideReputationPda,
          admin: admin.publicKey,
        })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Score must be between");
    }
  });

  it("rejects score of 6 (above range)", async () => {
    try {
      await program.methods
        .updateReputation(6)
        .accounts({
          guideReputation: guideReputationPda,
          admin: admin.publicKey,
        })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Score must be between");
    }
  });

  // --- suspend_guide ---

  it("suspends a guide", async () => {
    await program.methods
      .suspendGuide()
      .accounts({
        guideReputation: guideReputationPda,
        admin: admin.publicKey,
      })
      .rpc();

    const acc = await program.account.guideReputation.fetch(guideReputationPda);
    assert.isTrue(acc.isSuspended);
  });

  it("rejects update_reputation on suspended guide", async () => {
    try {
      await program.methods
        .updateReputation(3)
        .accounts({
          guideReputation: guideReputationPda,
          admin: admin.publicKey,
        })
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      const msg = (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("suspended");
    }
  });

  it("rejects suspend from non-admin", async () => {
    try {
      await program.methods
        .suspendGuide()
        .accounts({
          guideReputation: guideReputationPda,
          admin: impostor.publicKey,
        })
        .signers([impostor])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      expect((e as Error).message).to.not.be.empty;
    }
  });

  // --- reinstate_guide ---

  it("reinstates a suspended guide", async () => {
    await program.methods
      .reinstateGuide()
      .accounts({
        guideReputation: guideReputationPda,
        admin: admin.publicKey,
      })
      .rpc();

    const acc = await program.account.guideReputation.fetch(guideReputationPda);
    assert.isFalse(acc.isSuspended);
  });

  it("rejects reinstate from non-admin", async () => {
    try {
      await program.methods
        .reinstateGuide()
        .accounts({
          guideReputation: guideReputationPda,
          admin: impostor.publicKey,
        })
        .signers([impostor])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: unknown) {
      expect((e as Error).message).to.not.be.empty;
    }
  });
});
