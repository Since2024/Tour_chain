import { mkdirSync, readdirSync, copyFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const sourceDir = resolve("target/idl");
const destinationDir = resolve("apps/web/src/lib/solana/idl");

if (!existsSync(sourceDir)) {
  throw new Error(`IDL source directory not found: ${sourceDir}`);
}

mkdirSync(destinationDir, { recursive: true });

const idlFiles = readdirSync(sourceDir).filter((file) => file.endsWith(".json"));
for (const file of idlFiles) {
  copyFileSync(join(sourceDir, file), join(destinationDir, file));
}

console.log(`Copied ${idlFiles.length} IDL files to ${destinationDir}`);
