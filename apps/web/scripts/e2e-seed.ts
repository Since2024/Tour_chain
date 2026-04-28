import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in apps/web/.env.local or in the shell env)",
  );
}

const supabase = createClient(url, serviceRole);

async function ensurePublicUser(): Promise<{ publicUserId: string }> {
  // Try to find any existing public user row first.
  const existing = await supabase.from("users").select("id").limit(1).maybeSingle();
  if (existing.data?.id) return { publicUserId: existing.data.id as string };

  // Create an Auth user (requires service role key).
  const email = `seed_${Date.now()}@tourchain.local`;
  const password = `SeedPass_${Math.random().toString(16).slice(2)}aA1!`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("Failed to create auth user");
  }
  const authUserId = created.data.user.id;

  // Insert into public.users with best-effort column compatibility.
  const candidates: Array<Record<string, unknown>> = [
    { id: authUserId, email, display_name: "Seed User", role: "tourist" },
    { auth_id: authUserId, email, display_name: "Seed User", role: "tourist" },
    { id: crypto.randomUUID(), auth_id: authUserId, email, display_name: "Seed User", role: "tourist" },
  ];

  for (const payload of candidates) {
    const attempt = await supabase.from("users").insert(payload).select("id").maybeSingle();
    if (!attempt.error && attempt.data?.id) {
      return { publicUserId: attempt.data.id as string };
    }
  }

  // If inserts failed, surface a helpful error.
  throw new Error(
    "Unable to create public user row. Your `users` table schema differs (extra required columns). Create a row manually in Supabase for now, or share the exact table columns so we can update the seeder.",
  );
}

async function ensureGuide(publicUserId: string): Promise<{ guideId: string }> {
  const existing = await supabase.from("guides").select("id").limit(1).maybeSingle();
  if (existing.data?.id) return { guideId: existing.data.id as string };

  const guideId = crypto.randomUUID();
  const rich = await supabase
    .from("guides")
    .insert({ id: guideId, user_id: publicUserId, is_verified: true, years_experience: 1 })
    .select("id")
    .maybeSingle();
  if (!rich.error && rich.data?.id) return { guideId: rich.data.id as string };

  // Some schemas require a wallet pubkey for guides.
  const minimal = await supabase
    .from("guides")
    .insert({
      id: guideId,
      user_id: publicUserId,
      name: "Seed Guide",
      wallet_pubkey: "11111111111111111111111111111111",
    })
    .select("id")
    .maybeSingle();
  if (minimal.error || !minimal.data?.id) throw minimal.error ?? new Error("Failed to create guide");
  return { guideId: minimal.data.id as string };
}

async function ensureRoute(): Promise<{ routeId: string }> {
  const existing = await supabase.from("routes").select("id").limit(1).maybeSingle();
  if (existing.data?.id) return { routeId: existing.data.id as string };

  const routeId = crypto.randomUUID();
  const payload = {
    id: routeId,
    name: "Poon Hill Sunrise Trek",
    description: "Short scenic trek for sunrise panoramas and Gurung villages.",
    difficulty: "easy",
    duration_days: 4,
    region: "Annapurna",
  };

  // Try insert with is_active first, then without.
  const first = await supabase.from("routes").insert({ ...payload, is_active: true }).select("id").maybeSingle();
  if (!first.error && first.data?.id) return { routeId: first.data.id as string };
  const second = await supabase.from("routes").insert(payload).select("id").maybeSingle();
  if (second.error || !second.data?.id) throw second.error ?? new Error("Failed to create route");
  return { routeId: second.data.id as string };
}

async function ensureService(guideId: string, routeId: string): Promise<{ serviceId: string }> {
  const existing = await supabase.from("services").select("id").limit(1).maybeSingle();
  if (existing.data?.id) return { serviceId: existing.data.id as string };

  const serviceId = crypto.randomUUID();
  const base = {
    id: serviceId,
    guide_id: guideId,
    route_id: routeId,
    title: "Poon Hill Guided Trek",
    description: "A minimal seeded service to test booking + trek flow.",
  };

  const attempts: Array<Record<string, unknown>> = [
    { ...base, price_sol: 0.1, duration_days: 4, is_active: true },
    { ...base, price_sol: 0.1, duration_days: 4 },
    { ...base, price_usd: 350, max_group_size: 8, is_active: true },
    { ...base, price_usd: 350, is_active: true },
    { ...base, price_usd: 350 },
  ];

  let lastError: unknown = null;
  for (const payload of attempts) {
    const inserted = await supabase.from("services").insert(payload).select("id").maybeSingle();
    if (!inserted.error && inserted.data?.id) return { serviceId: inserted.data.id as string };
    if (inserted.error) lastError = inserted.error;
  }

  throw new Error(`Failed to create service (schema mismatch). Last error: ${JSON.stringify(lastError)}`);
}

async function ensurePlaces(): Promise<void> {
  const existing = await supabase.from("places").select("id").limit(1).maybeSingle();
  if (existing.data?.id) return;

  const basePlaces = [
    {
      id: crypto.randomUUID(),
      name: "Nayapul",
      description: "Start for Ghorepani-Poon Hill route.",
      region: "Annapurna",
      latitude: 28.3323,
      longitude: 83.8107,
    },
    {
      id: crypto.randomUUID(),
      name: "Poon Hill",
      description: "Sunrise viewpoint over Annapurna and Dhaulagiri.",
      region: "Annapurna",
      latitude: 28.4008,
      longitude: 83.6847,
    },
  ];

  const attempts: Array<Array<Record<string, unknown>>> = [
    // Full schema (category + is_active)
    basePlaces.map((p) => ({ ...p, category: "checkpoint", is_active: true })),
    // Without is_active
    basePlaces.map((p) => ({ ...p, category: "checkpoint" })),
    // Without category
    basePlaces.map((p) => ({ ...p, is_active: true })),
    basePlaces,
    // lat/lng variants
    basePlaces.map(({ latitude, longitude, ...rest }) => ({ ...rest, lat: latitude, lng: longitude, is_active: true })),
    basePlaces.map(({ latitude, longitude, ...rest }) => ({ ...rest, lat: latitude, lng: longitude })),
  ];

  let lastError: unknown = null;
  for (const batch of attempts) {
    const res = await supabase.from("places").insert(batch).select("id");
    if (!res.error) return;
    lastError = res.error;
  }

  throw new Error(`Failed to create places. Last error: ${JSON.stringify(lastError)}`);
}

async function run() {
  // This script ensures a minimal “happy path” dataset in Supabase so you can click through:
  // explore -> book -> dashboard -> trek -> check-in.
  // It DOES create an auth user + public profile if needed (service role key required).

  const { publicUserId } = await ensurePublicUser();
  const { guideId } = await ensureGuide(publicUserId);
  const { routeId } = await ensureRoute();
  const { serviceId } = await ensureService(guideId, routeId);
  await ensurePlaces();

  console.log("Seed OK:");
  console.log({ routeId, guideId, serviceId });
  console.log("Next: open /explore then book /book/<routeId>.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

