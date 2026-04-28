import * as fs from "fs";
import * as path from "path";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum, createTree } from "@metaplex-foundation/mpl-bubblegum";
import { keypairIdentity, generateSigner } from "@metaplex-foundation/umi";
import {
  fromWeb3JsKeypair,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";

async function main() {
  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    console.error("ERROR: ANCHOR_WALLET env var is required");
    console.error(
      "  export ANCHOR_WALLET=~/.config/solana/id.json && ts-node scripts/init-merkle-tree.ts"
    );
    process.exit(1);
  }

  const rpcUrl =
    process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";

  const rawKeypair = JSON.parse(
    fs.readFileSync(path.resolve(walletPath), "utf-8")
  );
  const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(rawKeypair));

  const connection = new Connection(rpcUrl, "confirmed");
  const balance = await connection.getBalance(solanaKeypair.publicKey);
  if (balance < 2 * LAMPORTS_PER_SOL) {
    console.error(
      `ERROR: Insufficient balance: ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL — need >= 2 SOL to fund the tree`
    );
    process.exit(1);
  }
  console.log(
    `Wallet: ${solanaKeypair.publicKey.toBase58()} (${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL)`
  );

  const umi = createUmi(rpcUrl).use(mplBubblegum());
  const umiKeypair = fromWeb3JsKeypair(solanaKeypair);
  umi.use(keypairIdentity(umiKeypair));

  const merkleTree = generateSigner(umi);

  console.log("Creating merkle tree...");
  console.log("  maxDepth: 14, maxBufferSize: 64, canopyDepth: 0 (~16K mints)");

  await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 0,
  }).sendAndConfirm(umi);

  const treeAddress = toWeb3JsPublicKey(merkleTree.publicKey).toBase58();
  console.log(`\nMerkle tree created: ${treeAddress}`);

  const envLocalPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    ".env.local"
  );

  const envLine = `NEXT_PUBLIC_MERKLE_TREE=${treeAddress}`;

  if (fs.existsSync(envLocalPath)) {
    const existing = fs.readFileSync(envLocalPath, "utf-8");
    if (existing.includes("NEXT_PUBLIC_MERKLE_TREE=")) {
      const updated = existing.replace(
        /NEXT_PUBLIC_MERKLE_TREE=.*/,
        envLine
      );
      fs.writeFileSync(envLocalPath, updated);
    } else {
      fs.appendFileSync(envLocalPath, `\n${envLine}\n`);
    }
  } else {
    fs.writeFileSync(envLocalPath, `${envLine}\n`);
  }

  console.log(`Wrote ${envLine} to apps/web/.env.local`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
