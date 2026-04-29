import { z } from "zod";

function assertEnv<T>(
  schema: z.ZodType<T>,
  values: Record<string, string | undefined>,
  label: string,
): T {
  const result = schema.safeParse(values);
  if (!result.success) {
    // During `next build`, Next.js imports every route module to collect page
    // data. Throwing here would abort the build before any request is handled.
    // Skip validation during build — the server will throw on the first request
    // if vars are still missing at runtime.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return {} as T;
    }
    const lines = result.error.issues
      .map((i) => `  ${String(i.path[0] ?? "unknown")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[${label}] Missing or invalid environment variables:\n${lines}\n\nCopy apps/web/.env.example → apps/web/.env.local and fill in the values.`,
    );
  }
  return result.data;
}

// ── Public env (NEXT_PUBLIC_*) ──────────────────────────────────────────────
// Validated on both client and server at module load. App will crash with a
// clear message if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY
// are missing.
export const publicEnv = assertEnv(
  z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "required"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "required"),
    NEXT_PUBLIC_SOLANA_CLUSTER: z.string().default("devnet"),
    NEXT_PUBLIC_SOLANA_RPC: z.string().default("https://api.devnet.solana.com"),
    NEXT_PUBLIC_REPUTATION_PROGRAM_ID: z.string().optional(),
    NEXT_PUBLIC_ESCROW_PROGRAM_ID: z.string().optional(),
    NEXT_PUBLIC_PROOF_PROGRAM_ID: z.string().optional(),
    NEXT_PUBLIC_MERKLE_TREE: z.string().optional(),
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
    NEXT_PUBLIC_ADMIN_PUBKEY: z.string().optional(),
  }),
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC: process.env.NEXT_PUBLIC_SOLANA_RPC,
    NEXT_PUBLIC_REPUTATION_PROGRAM_ID: process.env.NEXT_PUBLIC_REPUTATION_PROGRAM_ID,
    NEXT_PUBLIC_ESCROW_PROGRAM_ID: process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID,
    NEXT_PUBLIC_PROOF_PROGRAM_ID: process.env.NEXT_PUBLIC_PROOF_PROGRAM_ID,
    NEXT_PUBLIC_MERKLE_TREE: process.env.NEXT_PUBLIC_MERKLE_TREE,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ADMIN_PUBKEY: process.env.NEXT_PUBLIC_ADMIN_PUBKEY,
  },
  "PublicEnv",
);

// ── Server env ──────────────────────────────────────────────────────────────
// Never import this in client components — Next.js strips non-NEXT_PUBLIC_ vars
// from client bundles. The typeof window guard skips validation in the browser
// so client bundles don't crash on missing server vars.
export const serverEnv =
  typeof window === "undefined"
    ? assertEnv(
        z.object({
          SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "required"),
          SOLANA_PLATFORM_KEYPAIR: z.string().optional(),
        }),
        {
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          SOLANA_PLATFORM_KEYPAIR: process.env.SOLANA_PLATFORM_KEYPAIR,
        },
        "ServerEnv",
      )
    : ({ SUPABASE_SERVICE_ROLE_KEY: "", SOLANA_PLATFORM_KEYPAIR: undefined } as {
        SUPABASE_SERVICE_ROLE_KEY: string;
        SOLANA_PLATFORM_KEYPAIR?: string;
      });

// Combined — use this in server-side files for convenience
export const env = { ...publicEnv, ...serverEnv };
