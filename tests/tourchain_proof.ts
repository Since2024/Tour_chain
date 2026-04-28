import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import type { TourchainProof } from "../target/types/tourchain_proof";

describe("tourchain_proof", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TourchainProof as Program<TourchainProof>;

  const admin = (provider.wallet as anchor.Wallet).payer;
  const impostor = Keypair.generate();

  let proofAuthorityPda: PublicKey;
  const fakeMerkleTree = Keypair.generate().publicKey;

  before(async () => {
    [proofAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proof_authority")],
      program.programId
    );

    const sig = await provider.connection.requestAirdrop(
      impostor.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  });

  it("initializes the proof authority", async () => {
    await program.methods
      .initializeProofAuthority(fakeMerkleTree)
      .accounts({
        proofAuthority: proofAuthorityPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.proofAuthority.fetch(proofAuthorityPda);
    assert.equal(acc.admin.toBase58(), admin.publicKey.toBase58());
    assert.equal(acc.merkleTree.toBase58(), fakeMerkleTree.toBase58());
    assert.equal(acc.totalMinted.toNumber(), 0);
  });

  it("rejects mint_completion_proof from non-admin", async () => {
    const dummy = Keypair.generate().publicKey;

    try {
      await program.methods
        .mintCompletionProof(
          "Trek Complete",
          "TREK",
          "https://example.com/proof.json"
        )
        .accounts({
          proofAuthority: proofAuthorityPda,
          admin: impostor.publicKey,
          treeConfig: dummy,
          leafOwner: dummy,
          leafDelegate: dummy,
          merkleTree: dummy,
          logWrapper: dummy,
          compressionProgram: dummy,
          bubblegumProgram: dummy,
          systemProgram: SystemProgram.programId,
        })
        .signers([impostor])
        .rpc();
      assert.fail("should have thrown UnauthorizedAdmin");
    } catch (e: unknown) {
      const msg =
        (e as anchor.AnchorError).error?.errorMessage ?? (e as Error).message;
      expect(msg).to.include("Caller is not the registered admin");
    }
  });
});
