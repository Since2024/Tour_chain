#!/usr/bin/env npx ts-node
/**
 * Inserts seed data (routes, places, guides, quests) into the remote Supabase project
 * using the service-role key. Safe to re-run — upserts on conflict.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/apply-seed.ts
 *   OR: load from apps/web/.env.local automatically (dotenv)
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .forEach((l) => {
      const [k, ...v] = l.split("=");
      if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim();
    });
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  // Routes
  const { error: routesErr } = await supabase.from("routes").upsert([
    { id: "10000000-0000-0000-0000-000000000001", name: "Everest Base Camp Trek", description: "The classic high-altitude pilgrimage to the foot of the world's highest mountain, passing Sherpa villages, ancient monasteries, and dramatic Himalayan scenery.", difficulty: "challenging", duration_days: 14, distance_km: 130.0, max_altitude_meters: 5364, region: "Khumbu", is_active: true },
    { id: "10000000-0000-0000-0000-000000000002", name: "Annapurna Circuit", description: "A full circumnavigation of the Annapurna massif crossing the Thorong La pass at 5,416 m — one of the great classic treks of the world.", difficulty: "challenging", duration_days: 18, distance_km: 210.0, max_altitude_meters: 5416, region: "Annapurna", is_active: true },
    { id: "10000000-0000-0000-0000-000000000003", name: "Langtang Valley Trek", description: "A quieter alternative to the Everest and Annapurna regions, offering intimate views of Langtang Lirung and a warm welcome in Tamang villages.", difficulty: "moderate", duration_days: 9, distance_km: 65.0, max_altitude_meters: 4984, region: "Langtang", is_active: true },
    { id: "10000000-0000-0000-0000-000000000004", name: "Manaslu Circuit Trek", description: "A rugged remote circuit around the eighth-highest mountain in the world, requiring a special restricted-area permit.", difficulty: "extreme", duration_days: 16, distance_km: 177.0, max_altitude_meters: 5160, region: "Gorkha", is_active: true },
    { id: "10000000-0000-0000-0000-000000000005", name: "Poon Hill Sunrise Trek", description: "A short, rewarding trek from Pokhara to Poon Hill, famous for its panoramic dawn view of Dhaulagiri, Annapurna South, and Machapuchare.", difficulty: "easy", duration_days: 4, distance_km: 40.0, max_altitude_meters: 3210, region: "Annapurna", is_active: true },
  ], { onConflict: "id" });
  if (routesErr) { console.error("routes:", routesErr.message); } else { console.log("✓ 5 routes upserted"); }

  // Places
  const { error: placesErr } = await supabase.from("places").upsert([
    { id: "20000000-0000-0000-0000-000000000001", name: "Lukla Airport (Tenzing–Hillary Airport)", description: "The starting point for most Everest treks — one of the world's most dramatic airstrips at 2,860 m.", category: "trailhead", latitude: 27.6869, longitude: 86.7298, altitude_meters: 2860, region: "Khumbu", is_active: true },
    { id: "20000000-0000-0000-0000-000000000002", name: "Namche Bazaar", description: "The busy Sherpa trading hub and acclimatisation stop at 3,440 m, gateway to the high Khumbu.", category: "village", latitude: 27.8054, longitude: 86.7139, altitude_meters: 3440, region: "Khumbu", is_active: true },
    { id: "20000000-0000-0000-0000-000000000003", name: "Tengboche Monastery", description: "The most famous monastery in the Khumbu region, perched on a ridge with a full Everest panorama.", category: "temple", latitude: 27.8362, longitude: 86.7642, altitude_meters: 3867, region: "Khumbu", is_active: true },
    { id: "20000000-0000-0000-0000-000000000004", name: "Everest Base Camp", description: "The legendary camp at 5,364 m where Everest expeditions begin.", category: "summit", latitude: 28.0026, longitude: 86.8528, altitude_meters: 5364, region: "Khumbu", is_active: true },
    { id: "20000000-0000-0000-0000-000000000005", name: "Besisahar Trailhead", description: "The traditional starting village of the Annapurna Circuit at 760 m.", category: "trailhead", latitude: 28.2303, longitude: 84.3836, altitude_meters: 760, region: "Annapurna", is_active: true },
    { id: "20000000-0000-0000-0000-000000000006", name: "Manang Village", description: "High-altitude Annapurna acclimatisation village at 3,519 m with views of Annapurna III and Gangapurna.", category: "village", latitude: 28.6699, longitude: 84.0188, altitude_meters: 3519, region: "Annapurna", is_active: true },
    { id: "20000000-0000-0000-0000-000000000007", name: "Thorong La Pass", description: "The 5,416 m high point of the Annapurna Circuit — one of the highest trekking passes in the world.", category: "summit", latitude: 28.7902, longitude: 83.9297, altitude_meters: 5416, region: "Annapurna", is_active: true },
    { id: "20000000-0000-0000-0000-000000000008", name: "Muktinath Temple", description: "Sacred Hindu and Buddhist pilgrimage site at 3,800 m, with 108 water spouts and an eternal flame.", category: "temple", latitude: 28.8175, longitude: 83.8722, altitude_meters: 3800, region: "Mustang", is_active: true },
    { id: "20000000-0000-0000-0000-000000000009", name: "Syabrubesi", description: "Entry point for the Langtang Valley trek at 1,503 m, a small Tamang village near the Tibetan border.", category: "trailhead", latitude: 28.1583, longitude: 85.3425, altitude_meters: 1503, region: "Langtang", is_active: true },
    { id: "20000000-0000-0000-0000-000000000010", name: "Kyanjin Gompa", description: "A remote monastery at 3,870 m at the head of Langtang Valley, with views of Langtang Lirung.", category: "temple", latitude: 28.2121, longitude: 85.5712, altitude_meters: 3870, region: "Langtang", is_active: true },
    { id: "20000000-0000-0000-0000-000000000011", name: "Ghorepani Village", description: "Rhododendron-forested teahouse village at 2,860 m, the overnight base for the Poon Hill sunrise.", category: "village", latitude: 28.4008, longitude: 83.7004, altitude_meters: 2860, region: "Annapurna", is_active: true },
    { id: "20000000-0000-0000-0000-000000000012", name: "Poon Hill Viewpoint", description: "The 3,210 m hilltop with a panoramic view of Dhaulagiri, Annapurna South, Hiunchuli, and Machapuchare at sunrise.", category: "viewpoint", latitude: 28.4003, longitude: 83.6936, altitude_meters: 3210, region: "Annapurna", is_active: true },
    { id: "20000000-0000-0000-0000-000000000013", name: "Soti Khola Trailhead", description: "Starting point of the Manaslu Circuit at 700 m, where the road ends and the trail begins.", category: "trailhead", latitude: 28.2914, longitude: 84.8622, altitude_meters: 700, region: "Gorkha", is_active: true },
    { id: "20000000-0000-0000-0000-000000000014", name: "Lho Village", description: "Remote Nubri village at 3,180 m with direct views of Manaslu's south face and an ancient gompa.", category: "village", latitude: 28.5826, longitude: 84.7229, altitude_meters: 3180, region: "Gorkha", is_active: true },
    { id: "20000000-0000-0000-0000-000000000015", name: "Fewa Lake Island (Laughing Island)", description: "A small forested island in Pokhara's Fewa Lake accessible by rowboat, home to a small Barahi temple.", category: "activity_center", latitude: 28.2109, longitude: 83.9563, altitude_meters: 820, region: "Pokhara", is_active: true },
  ], { onConflict: "id" });
  if (placesErr) { console.error("places:", placesErr.message); } else { console.log("✓ 15 places upserted"); }

  // Admin + guide users
  const { error: usersErr } = await supabase.from("users").upsert([
    { id: "00000000-0000-0000-0000-000000000001", email: "admin@tourchain.app", display_name: "TourChain Admin", role: "admin" },
    { id: "30000000-0000-0000-0000-000000000001", email: "pemba@tourchain.app", display_name: "Pemba Sherpa", role: "guide" },
    { id: "30000000-0000-0000-0000-000000000002", email: "dawa@tourchain.app", display_name: "Dawa Tamang", role: "guide" },
    { id: "30000000-0000-0000-0000-000000000003", email: "lakpa@tourchain.app", display_name: "Lakpa Lama", role: "guide" },
  ], { onConflict: "id" });
  if (usersErr) { console.error("users:", usersErr.message); } else { console.log("✓ 4 users upserted"); }

  // Guides
  const { error: guidesErr } = await supabase.from("guides").upsert([
    { id: "40000000-0000-0000-0000-000000000001", user_id: "30000000-0000-0000-0000-000000000001", license_number: "NTB-2019-EBC-00142", bio: "Born in Namche Bazaar and raised in the shadow of Everest. I have summited Island Peak four times and guided over 200 trekkers to Everest Base Camp since 2012.", languages: ["Nepali", "English", "Sherpa", "Japanese"], specialties: ["Everest region", "high-altitude", "acclimatisation", "cultural tours"], years_experience: 12, is_verified: true, is_suspended: false },
    { id: "40000000-0000-0000-0000-000000000002", user_id: "30000000-0000-0000-0000-000000000002", license_number: "NTB-2021-ANN-00389", bio: "Third-generation Tamang guide from Besisahar. The Annapurna Circuit is my home trail — I know every teahouse owner and every weather pattern.", languages: ["Nepali", "English", "Tamang", "Hindi"], specialties: ["Annapurna", "Manaslu", "cultural immersion", "flora and fauna"], years_experience: 8, is_verified: true, is_suspended: false },
    { id: "40000000-0000-0000-0000-000000000003", user_id: "30000000-0000-0000-0000-000000000003", license_number: "NTB-2022-LNG-00512", bio: "Langtang local with deep roots in the Tamang community. After the 2015 earthquake reshaped Langtang Valley, I helped rebuild the trail and the tourism economy.", languages: ["Nepali", "English", "Tibetan"], specialties: ["Langtang", "Tamang heritage trail", "community-based tourism", "photography"], years_experience: 6, is_verified: true, is_suspended: false },
  ], { onConflict: "id" });
  if (guidesErr) { console.error("guides:", guidesErr.message); } else { console.log("✓ 3 guides upserted"); }

  console.log("\nDone. Verify with: curl <supabase-url>/rest/v1/routes?select=name");
}

run().catch((e) => { console.error(e); process.exit(1); });
