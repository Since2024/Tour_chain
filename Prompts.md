# TourChain — Claude Code CLI Prompt Pack v2

Execute in order. Each prompt assumes prior prompts succeeded. The first four prompts make the product visible. Everything after polishes and hardens.

---

## A. Production Visibility & Cleanup

---

### A1. Reset production Supabase and apply correct schema + seed

**Purpose:** Production DB has stale schema (status/specialisations/wallet_pubkey) that doesn't match local migrations (is_verified/specialties/license_number). Frontend is broken because it queries columns that don't exist. Reset and re-apply cleanly.

**Prompt:**
```
The production Supabase database has an outdated schema that doesn't match the local migrations. This is breaking guide-related queries in the frontend. Reset and re-apply.

1. Consolidate migrations first:
   - The repo has TWO migration directories: /supabase/migrations/ (root) and /apps/web/supabase/migrations/.
   - Move every file from /apps/web/supabase/migrations/ into /supabase/migrations/, preserving order numbers (0006_gamification_features.sql etc).
   - Delete /apps/web/supabase/ entirely.
   - Verify supabase/config.toml at the root points to the correct project_ref.

2. Reset the production database:
   - Connect to the linked production project: `supabase link --project-ref <id>`
   - Run via the Supabase SQL editor (production console):
     DROP SCHEMA public CASCADE;
     CREATE SCHEMA public;
     GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
   - Then `supabase db push --linked` to apply all migrations fresh.

3. Audit scripts/apply-seed.ts BEFORE running it. The seed script must use column names that match 0001_init_schema.sql exactly:
   - guides: is_verified, specialties (not specialisations), license_number, license_document_url
   - users: display_name, role
   - If the seed script uses old column names, fix it to match the current migration schema. Do not invent columns.

4. Run the seed: `npx tsx scripts/apply-seed.ts`

5. Verify in the SQL editor:
   SELECT count(*) FROM routes;          -- expect 5
   SELECT count(*) FROM places;          -- expect 15 (or 16 with default)
   SELECT count(*) FROM guides WHERE is_verified = true; -- expect 3
   SELECT count(*) FROM quests;          -- expect 10
   SELECT count(*) FROM route_checkpoints; -- expect at least 15
   SELECT count(*) FROM users;           -- expect at least 3 (one per guide)

6. REFRESH MATERIALIZED VIEW leaderboard;

7. Document the reset in docs/deployment.md so the next person knows the schema is canonical.

DO NOT TOUCH:
- The Anchor.toml program IDs.
- The frontend code in this prompt.

Acceptance:
- All counts above are correct.
- A SELECT against guides returns rows with is_verified, specialties, license_number columns (not the old names).
- /supabase/migrations/ is the only migration directory in the repo.

Pitfalls:
- supabase db reset only works on local; production requires manual DROP SCHEMA via SQL editor or supabase db push after dropping.
- If the seed script uses INSERT without ON CONFLICT, second runs will fail. Make seeds idempotent.
- RLS policies that reference auth.uid() can block service-role inserts in unexpected ways during seeding — the service role bypasses RLS, but functions called from RLS contexts may not.
- Don't lose the migration files when consolidating — verify file count before deleting the apps/web/supabase/ directory.
```

**Acceptance criteria:**
- Production schema matches local migrations exactly.
- Seed populated: 5 routes, 15 places, 3 verified guides, 10 quests.
- One canonical migration directory.

**Risks:**
- Resetting destroys any test user accounts (acceptable on devnet).
- Seed script using stale column names will fail silently mid-insert.

---

### A2. Set production environment variables on Vercel

**Purpose:** The map is blank, queries are broken, and on-chain features are unreachable because production env vars are missing. Set them all in one pass.

**Prompt:**
```
Configure all production environment variables in Vercel.

1. List required variables and their values. Do not invent values for secrets — surface the missing ones.

NEXT_PUBLIC_SUPABASE_URL=https://wxsdobqjeuowufhcgobj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project settings → API>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project settings → API; encrypted>
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_REPUTATION_PROGRAM_ID=BxgSbUELdL9cCj4hETtFJqyzDqFeRKAYefWBnVpDXk3L
NEXT_PUBLIC_ESCROW_PROGRAM_ID=B1M6gHx7W2tKPWwEEuKaumyk2H8zdETZGoBCDt9yamrt
NEXT_PUBLIC_PROOF_PROGRAM_ID=EvRzd8MXqxojEmn4jViXv8NyxVXoU3X1gEuSv1tw9qML
NEXT_PUBLIC_MERKLE_TREE=<from running scripts/init-merkle-tree.ts; if not run yet, set in A3>
NEXT_PUBLIC_ADMIN_PUBKEY=<the admin wallet pubkey>
NEXT_PUBLIC_MAPBOX_TOKEN=<from Mapbox account>
NEXT_PUBLIC_APP_URL=https://tour-chain.vercel.app
SOLANA_PLATFORM_KEYPAIR=<base58-encoded private key for platform admin signing; encrypted; server-only>

2. Use Vercel CLI: `vercel env add <name> production` for each. For sensitive ones (service role key, platform keypair), mark as encrypted.

3. CRITICAL: SOLANA_PLATFORM_KEYPAIR must NOT have NEXT_PUBLIC_ prefix. If it does, the secret leaks to the browser bundle.

4. After all variables are set, trigger a production redeploy: `vercel deploy --prod` or push a no-op commit. Next.js bakes NEXT_PUBLIC_ variables at build time — they don't apply until rebuild.

5. Verify by visiting the live URL:
   - https://tour-chain.vercel.app/explore should show routes (assuming A1 ran).
   - The Mapbox map should render.
   - Browser DevTools Network tab: confirm Supabase queries return 200.

6. Document the full env var list in docs/deployment.md with descriptions and where to obtain each.

Acceptance:
- All env vars set in Vercel production scope.
- /explore renders routes and a working map after redeploy.

Pitfalls:
- Setting NEXT_PUBLIC_* without redeploying does nothing — Next.js inlines at build.
- Using NEXT_PUBLIC_ on a server-only secret (e.g., service role key) is a security incident. Re-check every variable name has the right prefix.
- Mapbox token domains: lock the token to https://tour-chain.vercel.app and localhost in the Mapbox console to prevent abuse.
- Vercel scope confusion: variables can be set per environment (development / preview / production). Set production explicitly.
```

**Acceptance criteria:**
- Production live demo `/explore` shows routes and a rendered map.
- No client-side leak of service role or platform keypair.

**Risks:**
- Forgetting redeploy → variables not applied.
- Wrong NEXT_PUBLIC_ prefix on a secret.

---

### A3. Initialize the Bubblegum Merkle tree on devnet

**Purpose:** Without a Merkle tree, every cNFT mint will fail. This must be done once per cluster.

**Prompt:**
```
Initialize the Bubblegum Merkle tree on devnet so proof minting works.

1. Verify scripts/init-merkle-tree.ts exists. If not, create it. The script must:
   - Read keypair from ANCHOR_WALLET env var (~/.config/solana/id.json by default). Crash with clear message if missing.
   - Connect to devnet RPC.
   - Check the wallet has at least 2 SOL; if not, run `solana airdrop 2` programmatically (with retries because devnet faucet is rate-limited) or instruct the user to fund it.
   - Use @metaplex-foundation/mpl-bubblegum Umi plugin.
   - Call createTree with maxDepth=14, maxBufferSize=64, canopyDepth=0 (supports ~16K mints).
   - Print the tree address and the transaction signature.
   - Append to apps/web/.env.local: NEXT_PUBLIC_MERKLE_TREE={tree_address}
   - Print instructions to add the same value to Vercel production env vars.

2. After running the script, also call tourchain_proof.initialize_proof_authority() ONE TIME with the merkle_tree address from above. This creates the on-chain ProofAuthority PDA. Add this as a second part of the same script or a separate scripts/init-proof-authority.ts.

3. Verify the tree on Solana Explorer:
   - Tree account exists: https://explorer.solana.com/address/{tree}?cluster=devnet
   - ProofAuthority PDA exists with admin = platform admin pubkey

4. Add the merkle tree address to:
   - apps/web/.env.local
   - Vercel production env: NEXT_PUBLIC_MERKLE_TREE
   - docs/deployment.md (note that this is a one-time operation per cluster)

5. Test mint as a sanity check: write a tiny scripts/test-mint.ts that calls tourchain_proof.mint_completion_proof with dummy metadata. Verify the cNFT shows up in a wallet via the Solana Helius API or a wallet explorer.

DO NOT TOUCH:
- The actual proof-minting business logic in /api/proof/mint.

Acceptance:
- NEXT_PUBLIC_MERKLE_TREE is set in both .env.local and Vercel.
- ProofAuthority PDA exists on devnet.
- Test mint succeeds (sanity check).

Pitfalls:
- maxDepth=14 trees cost ~2 SOL on devnet for rent. Cheaper trees (maxDepth=10, ~1K capacity) work for demo but limit growth.
- The script's success is not enough — without the env var update and Vercel redeploy, the live site still can't mint.
- Run init-proof-authority AFTER the tree is created, not before.
- Tree creation is irreversible. If you create the wrong size, you have to make a new one.
```

**Acceptance criteria:**
- Merkle tree exists on devnet.
- ProofAuthority PDA initialized.
- NEXT_PUBLIC_MERKLE_TREE set in Vercel.
- Test mint works.

**Risks:**
- Faucet rate limiting blocks the airdrop step.
- Wrong tree size locks the project into a low ceiling.

---

### A4. Delete scope drift: /dao, /quests 404, dual branding, dead artifacts

**Purpose:** Remove everything that confuses the product narrative or duplicates data sources.

**Prompt:**
```
Delete scope-drift and dead artifacts in a single pass.

1. DELETE /dao entirely:
   - Remove apps/web/src/app/dao/ directory.
   - Remove DAO link from Navbar.tsx and any other navigation component.
   - Remove DAO references from layout, footer, any "explore by feature" sections.
   - Search for "dao" and "trustdao" string literals across the entire repo and clean up.

2. DELETE the /quests page reference everywhere it leads to a 404:
   - Search for any <Link href="/quests"> or router.push('/quests'). Either remove these links or implement /quests properly. Given quests are gamification surface that the audit flagged as overbuilt, prefer removal.
   - Remove the quests entry from any nav or "what to do" sections.
   - Keep the quests TABLE in Supabase (quests are linked to routes for narrative). Just don't expose them as a top-level page yet.

3. RENAME /vibe to /proofs:
   - Move apps/web/src/app/vibe/ → apps/web/src/app/proofs/
   - Update all internal links from /vibe to /proofs.
   - Rename page heading from "Himalayan Vibe" to "Your Proofs".
   - Subtitle: "Permanent on-chain records of your completed treks."
   - Update Navbar to show "My Proofs" only when authenticated.

4. RECONCILE branding to "TourChain" globally:
   - apps/web/src/app/layout.tsx <title>: "TourChain — Trust-first trekking in Nepal"
   - All occurrences of "Tourism Chain Nepal" → "TourChain" in .tsx, .ts, .md, .json (except git history).
   - Update README.md hero, package.json name, apps/web/package.json name.

5. DELETE these files entirely:
   - report.md (stale; describes pre-refactor 9-program architecture)
   - claude-session.jsonl (internal AI tooling state)
   - apps/web/src/lib/demo/catalog.ts (fake demo catalog; replaced by real DB seed)
   - Any contracts/ directory at repo root if it duplicates programs/ (verify contents first; report what's there if non-empty)
   - apps/web/src/lib/quests.ts hardcoded quest array (the DB has the quests table; this is a duplicate source of truth)

6. ADD to .gitignore:
   - claude-session.jsonl
   - *.session.jsonl
   - .env.local

7. PICK ONE map library — prefer Mapbox since it's already used:
   - Remove leaflet and react-leaflet from package.json.
   - Search for any imports of 'leaflet' or 'react-leaflet' in apps/web/src/ and convert to Mapbox or delete.
   - Run `npm install` to update lockfile.

8. REMOVE hardcoded testimonials on the landing page:
   - In the testimonials component, replace the hardcoded array with either real reviews from Supabase (top 3 reviews where rating=5) OR remove the testimonials section entirely if there are no real reviews yet.
   - Fake testimonials on a trust platform are a trust problem.

9. UPDATE the audit document at docs/audit.md (move tourchain-audit.md there) and reference it from the README.

DO NOT TOUCH:
- Any working flow logic.
- The Solana programs.
- The database schema.

Acceptance:
- /dao returns 404 in production after redeploy.
- /quests link nowhere appears in the nav.
- /proofs renders the previously-/vibe UI.
- No file under apps/web/src/ contains "Tourism Chain Nepal".
- No mock testimonials shipped.
- Single map library: Mapbox.
- npm run build succeeds with zero broken imports.

Pitfalls:
- Hardcoded routes via template literals (`href={`/${section}`}`) escape simple grep — use IDE refactor or a regex sweep.
- Leaflet may be bundled in a feature-flagged code path; verify dynamic imports too.
- Removing testimonials section without removing the empty container leaves vertical whitespace; check the layout still looks right.
```

**Acceptance criteria:**
- Demo no longer has scope-drift pages.
- Single product name everywhere.
- One map library.
- No mock data shipped to production.

**Risks:**
- Hidden references via template literals or dynamic imports.
- Layout shift from removed sections.

---

### A5. Replace zero-counters with honest stats or remove them

**Purpose:** "0 Tourists / $0 in Escrow / 0 NFTs Minted" actively undermines the trust pitch. Either show real numbers or hide the section.

**Prompt:**
```
Audit every visible counter on the landing page and other public pages. Make them honest.

1. Identify all numeric stats in apps/web/src/app/(public)/page.tsx and any homepage components.

2. Wire each to real Supabase server-side counts:
   - "Verified routes": SELECT count(*) FROM routes WHERE is_active
   - "Verified guides": SELECT count(*) FROM guides WHERE is_verified
   - "Completed treks": SELECT count(*) FROM bookings WHERE status='completed'
   - "Proofs minted": SELECT count(*) FROM completion_proofs

3. RULE: if a count is 0, hide that stat entirely. Never show "0 X" to a visitor — it actively contradicts the trust message.

4. Reorder display: only show stats above 0, in order of impressiveness: routes > guides > treks > proofs.

5. If ALL stats are zero, hide the entire stats row. Replace it with a single line: "Built for Nepal's trekking community. Live on Solana devnet."

6. Server-side fetch with caching: use Next.js fetch with `next: { revalidate: 60 }` so the counts don't query Supabase on every request.

7. Apply the same rule to:
   - /explore: hide "0 routes" header; only show "{N} routes available" if N > 0.
   - /proofs: empty state already handled in A4 rename.
   - Leaderboard page: empty state if fewer than 3 entries.

DO NOT TOUCH:
- Stats inside authenticated dashboards (those should always show, including 0 — it's the user's own data).

Acceptance:
- Landing page never shows "0 X" anywhere.
- After A1+A2 land, real stats are visible (5 routes, 3 guides).

Pitfalls:
- Don't accidentally cache stats too aggressively — 60s revalidate is reasonable, not 24h.
- Server components: stats fetched in async Server Components are baked into the HTML stream. Don't put them in client components or you'll see hydration flashes.
- If stats fail to fetch, render the page without the stats row — never crash the homepage on a stats query failure.
```

**Acceptance criteria:**
- No "0" counters visible to public visitors.
- Real counts displayed when data exists.

**Risks:**
- Aggressive caching shows stale numbers.
- Failed stats query crashes the page if not wrapped in error handling.

---

## B. UI/UX Around the Core Loop

---

### B1. Rebuild the landing page around the core loop

**Purpose:** A first-time tourist must understand what TourChain does in 10 seconds and have one obvious thing to do next.

**Prompt:**
```
Rewrite apps/web/src/app/(public)/page.tsx (and any home subcomponents) for a first-time tourist visitor. Think like the visitor: they have never heard of TourChain, they don't know what Solana is, and they have 10 seconds to decide whether to stay.

1. HERO (above the fold):
   - H1 (one sentence): "Trek Nepal with verified guides. Trustless escrow. Proof on-chain."
   - Subhead (one sentence): "Book a verified guide, pay into a Solana escrow, complete your trek, and earn a permanent proof of your journey."
   - Primary CTA button: "Browse routes →" → /explore
   - Secondary link below: "How it works" → smooth-scroll to #how-it-works
   - Background: keep the existing Himalayan panorama image.
   - DO NOT use jargon: no PDA, no smart contract, no NFT, no Web3. Use "verified," "escrow," "on-chain proof."

2. STATS row (only visible when counts > 0, per A5):
   - Three stats max, simple cards
   - "{N} verified routes / {N} guides ready / {N} treks completed"

3. HOW IT WORKS (#how-it-works anchor, three clear steps):
   STEP 1: "Pick your trek"
     - "Browse 5+ verified routes across Nepal. Each one mapped, costed, and reviewed by past travelers."
   STEP 2: "Book and fund a guide"
     - "Choose a verified local guide. Funds are held in a Solana escrow — released to the guide as you complete each milestone."
   STEP 3: "Trek and earn proof"
     - "Check in at each waypoint on your phone's GPS. Complete the trek and a permanent proof is minted to your wallet."

4. WHY TOURCHAIN (three cards):
   - "Verified guides" — every guide is admin-reviewed before listing.
   - "Escrow protected" — your funds are released milestone-by-milestone, not paid upfront.
   - "Proof you can show" — your completed treks are permanently on-chain, not lost in a TripAdvisor profile someone else owns.

5. PROOF SECTION (new):
   - "See it on-chain" header
   - Three Solana Explorer deep-links:
     - "Reputation program → explorer.solana.com/address/{REPUTATION_PROGRAM_ID}?cluster=devnet"
     - "Escrow program → ..."
     - "Proof program → ..."
   - When a demo journey exists (after G1), add: "View a completed trek → /proof/[mintAddress]"
   - This section turns the marketing into verifiable.

6. FOOTER (minimal):
   - GitHub link
   - "Built for Nepal trekking. Live on Solana devnet."
   - Year + copyright

7. REMOVE:
   - All hardcoded testimonials.
   - Auto-rotating carousels.
   - Particle background animations (pretty but slow on mobile).
   - Any blockchain jargon that doesn't serve the visitor.

8. KEEP:
   - The visual design system (typography, color palette).
   - Subtle Framer Motion entrance animations on hero and step cards.

9. Test on mobile: hero CTA must be reachable in the bottom 1/3 of viewport. No horizontal scroll. All copy readable at 375px width.

DO NOT TOUCH:
- The /explore page (handled in B2).
- The Navbar component.

Acceptance:
- A first-time visitor can articulate "what does this do" within 10 seconds of landing.
- One primary CTA visible without scrolling.
- Three Solana Explorer links resolve to deployed programs on devnet.
- Mobile layout works at 375px.
- No "0" counters, no fake testimonials, no jargon.

Pitfalls:
- Adding multiple CTAs dilutes intent — keep ONE primary, one secondary.
- Server Components vs Client Components: stats and CTAs are server-fetched; animations require client. Split correctly.
- Don't pre-render stats that fail — wrap in try/catch and render the page without that section on failure.
- Hero image must be optimized (next/image) — large unoptimized images destroy mobile load time.
```

**Acceptance criteria:**
- Hero clearly states product in two lines.
- Single primary CTA above the fold.
- No jargon, no fake content.
- Mobile-friendly.

**Risks:**
- Server/client component boundary errors.
- Failed stats fetch crashing the homepage.

---

### B2. Make /explore a real route browser

**Purpose:** A visitor must see real routes on a real map and click into one in two clicks.

**Prompt:**
```
Rebuild apps/web/src/app/(auth)/explore/page.tsx (or wherever it lives) as a real route browser. Confirm the route is public (not in auth-protected group; rename if needed).

Think like a tourist: "I want to see what treks are available, where they are, how hard, and how long. Then click into one to book."

1. SERVER COMPONENT data fetch:
   const { data: routes } = await supabase
     .from('routes')
     .select('*, route_checkpoints(*, places(*)), services(price_usd, guides!inner(id, is_verified, users!inner(display_name, avatar_url)))')
     .eq('is_active', true);

   Filter out routes with no verified guide offering them (they can't be booked).

2. LAYOUT:
   - Desktop: split-screen 50/50, map left, route cards right.
   - Mobile: stacked, map on top (300px height), cards below.
   - Sticky filter bar at top of cards column.

3. FILTERS:
   - Region: All / Annapurna / Everest / Langtang / Manaslu / Mustang
   - Difficulty: All / Easy / Moderate / Hard / Extreme
   - Filter state in URL query params: /explore?region=Everest&difficulty=Moderate
   - Both filters update visible cards AND map markers in real time.

4. ROUTE CARDS:
   - Hero image (route.image_url)
   - Route name (h3), region, difficulty pill (color-coded)
   - Duration (X days), distance (Y km), max altitude
   - "{N} checkpoints" (from route_checkpoints count)
   - "{N} verified guides" (from services count)
   - Starting price: "From ${min(price_usd) across services}"
   - Click → /route/[id]

5. MAP (Mapbox):
   - Center on Nepal (28.39, 84.12, zoom 6)
   - One marker per checkpoint place
   - Different marker color per route region
   - Click marker → highlight corresponding card and scroll to it
   - Hover marker → tooltip with place name
   - Pan/zoom enabled; rotation disabled on mobile.
   - If NEXT_PUBLIC_MAPBOX_TOKEN is missing, show a fallback panel: "Map currently unavailable. Cards are still browsable below." DO NOT crash.

6. EMPTY STATES (be honest):
   - No filters match: "No routes match your filters. Try widening the search."
   - DB has zero routes: "No routes available yet. Check back soon." (Should not happen after A1.)

7. REMOVE the existing "0 Verified Routes Available" header. Replace with: "{N} treks across the Himalayas" (only shown when N > 0).

8. Performance: lazy-load Mapbox via next/dynamic, ssr: false. Don't block initial page paint.

9. Mobile interactions: tapping a card highlights the marker; tapping a marker doesn't open a modal (it scrolls to the card to keep things calm).

DO NOT TOUCH:
- /route/[id] (handled in B3).
- The Navbar.

Acceptance:
- /explore loads in under 3s with all 5 routes visible.
- Clicking a card → /route/[id] for that route.
- Map markers correspond to actual checkpoints, color-coded by region.
- Filters update URL and content together.
- Mobile works at 375px.
- Empty states never show "0".

Pitfalls:
- N+1 queries: use the nested Supabase select syntax above to fetch routes + checkpoints + places + services + guides in one round trip.
- Map markers must be cleaned up on filter change (useEffect cleanup) or memory leaks accumulate.
- The page must be a server component for data fetching; the filter UI must be a client component. Split correctly.
- Mapbox missing token: graceful fallback, never a stack trace.
```

**Acceptance criteria:**
- Real routes from Supabase, real markers on map.
- Filters work and persist in URL.
- Mobile-responsive.

**Risks:**
- N+1 queries kill performance.
- Map cleanup leaks.

---

### B3. Build /route/[id] as the booking-decision page

**Purpose:** This page is where a tourist decides whether to book. It needs to show the route in detail and present verified guides clearly.

**Prompt:**
```
Build apps/web/src/app/(public)/route/[id]/page.tsx. This is the most important page for conversion.

Think like a tourist: "I'm interested in this trek. Tell me everything I need to know to commit. Show me who's leading it. Make it easy to book."

1. SERVER COMPONENT data fetch:
   - Route by id with all route_checkpoints(*, places(*)) ordered by sequence_order
   - Services for this route, joined to guides + users
   - For each guide: fetch on-chain GuideReputation PDA via apps/web/src/lib/solana/reputation.ts
     - Compute display_score = (total_score / total_reviews / 100).toFixed(1) when total_reviews > 0
     - "New" badge when total_reviews = 0
     - Cache the on-chain reads for 5 minutes via Next.js fetch revalidation

2. HEADER:
   - Route name as h1
   - Difficulty pill, duration, distance, max altitude — all in a single info row
   - Hero image (full-width, 16:9, optimized via next/image)
   - Region badge

3. ABOUT THIS TREK section:
   - route.description as prose paragraphs
   - Mapbox map showing the route polyline connecting checkpoints (in sequence_order)
   - Smaller markers; route line in himalayan-blue.

4. THE JOURNEY section (numbered checkpoints):
   - Each checkpoint as a card: place.name, altitude, place.description (1-2 sentences)
   - If a quest is linked to this checkpoint, show the quest title and a 1-line story excerpt
   - Connecting line between cards on desktop; vertical timeline on mobile

5. AVAILABLE GUIDES section (the conversion section):
   - One card per service (sorted by guide reputation desc, then price asc)
   - Card contents:
     - Guide avatar + display_name
     - On-chain reputation: "★ {score} from {N} reviews" or "New guide" badge
     - Languages spoken (small pills)
     - Price: "${price_usd} / person" prominently
     - Group size: "Up to {max_group_size} travelers"
     - What's included: pills like "Permit", "Meals", "Porter"
     - Primary CTA button: "Book with {first_name} →" → /book/[serviceId]
   - If guide is suspended, hide their service.
   - If no services, show: "No guides yet for this route. Check back soon."

6. TRUST AND PROOF section (new, before booking):
   - "What you'll receive on completion: a Solana cNFT permanently linking this trek to your wallet."
   - "Funds held in escrow, released to your guide milestone-by-milestone as you complete each checkpoint."
   - Two micro-copy lines, no hype, no jargon.

7. STICKY MOBILE CTA:
   - Bottom-of-viewport bar showing "From ${min_price} • {N} guides" with a "View guides" button that scrolls to the AVAILABLE GUIDES section.
   - Hide on desktop.

8. SHARE: simple "Copy link" button in the header.

DO NOT TOUCH:
- /book/[serviceId] (handled in D1).
- /guide/[id] (handled in B4).

Acceptance:
- Page loads in under 3s with full data.
- Each guide's reputation reflects actual on-chain PDA state (or "New" if PDA doesn't exist).
- Map shows route polyline connecting all checkpoints in order.
- "Book with {name}" navigates to /book/[serviceId].
- Mobile sticky CTA appears at bottom on small screens.

Pitfalls:
- On-chain reputation reads are slow during SSR. Cache aggressively (5 min) and have a fallback for RPC failures.
- Reputation PDA may not exist for new guides — handle null without errors.
- Polyline requires checkpoints in sequence_order — don't trust the array order from the DB without an explicit sort.
- Image URLs from seed may be broken — always have a regional fallback image.
- Don't show suspended guides; verify is_suspended=false.
```

**Acceptance criteria:**
- Real route + real guides + real on-chain reputation.
- Booking CTA per guide leads to the correct service.
- Mobile-friendly with sticky CTA.

**Risks:**
- SSR latency from RPC reads.
- Stale cache showing wrong reputation.

---

### B4. Build /guide/[id] as the trust profile

**Purpose:** This is where trust is earned. A visitor must be able to inspect a guide deeply before paying them.

**Prompt:**
```
Build apps/web/src/app/(public)/guide/[id]/page.tsx. This is the trust artifact of the platform.

Think like a tourist: "Before I send money to a stranger in another country, who is this person? How do I know they're real? What do past travelers say?"

1. SERVER COMPONENT data fetch:
   - Guide by id, joined to users (display_name, avatar_url, wallet_address)
   - Services they offer, joined to routes
   - Reviews where guide_id = id, joined to reviewer's display_name and avatar_url, ordered by created_at desc, limit 20
   - On-chain GuideReputation PDA derived from users.wallet_address

2. PROFILE HEADER:
   - Avatar (large, circular)
   - Display name as h1
   - "✓ Verified Guide" badge if guides.is_verified
   - "⚠ Suspended" red banner if is_suspended (and disable booking on this page)
   - Languages, years_experience, region
   - Bio paragraph

3. TRUST METRICS row (the centerpiece):
   - On-chain reputation: large "★ {score}" with "{N} verified reviews"
   - "Treks completed: {completed_treks}" (from on-chain data)
   - "Active since: {active_since formatted as 'Mar 2024'}"
   - "View on Solana →" link to explorer.solana.com/address/{guide_pda}?cluster=devnet
   - If no on-chain data: "Reputation will appear after first completed trek."

4. SPECIALTIES + CREDENTIALS:
   - Specialties as small pills (e.g., "High-altitude", "Photography", "Cultural tours")
   - "License verified" badge if license_number is non-null (do NOT show the actual license number publicly — privacy)
   - "Verified by TourChain on {verified_at formatted}"

5. AVAILABLE TREKS section:
   - One card per service, joined to route info
   - Each: route name, duration, price, "Book this trek →" → /book/[serviceId]
   - Empty state: "No active services. This guide is taking a break."

6. REVIEWS section:
   - Each review card: reviewer avatar + name, ★★★★☆ rating, comment, date
   - Empty state: "No reviews yet — be the first to trek with {name}."
   - Pagination if > 10 reviews (load more button).

7. SAFETY note at footer:
   - "Have a problem with a booking? File a dispute from your trip dashboard."
   - Link to /dispute/new (if booking-tied) or contact info.

8. SHARE button: "Copy link"

DO NOT TOUCH:
- The escrow program.
- Booking flow.

Acceptance:
- Real guide profile with real reviews and real on-chain reputation.
- Suspended guides clearly flagged with disabled booking.
- License number NOT visible publicly (only the verified badge).
- "View on Solana" link works for guides with linked wallets.

Pitfalls:
- Wallet_address may be null for guides who haven't linked yet — handle the "Reputation not yet on-chain" case gracefully.
- Don't expose license_number, email, or any PII beyond display_name and bio.
- Reviews respect public-read RLS, but make sure reviewer's email isn't accidentally joined into the query.
- Active_since timestamp from chain may be 0 for newly-initialized PDAs; fall back to guides.verified_at from Supabase.
```

**Acceptance criteria:**
- Profile feels trustworthy and inspectable.
- No PII leaked.
- Solana Explorer link works.
- Suspended guides clearly flagged.

**Risks:**
- Accidentally joining sensitive columns from users into public queries.

---

### B5. Simplify navigation and create honest empty states everywhere

**Purpose:** The nav must show only relevant destinations per role. Empty states must never use the word "0".

**Prompt:**
```
Audit and simplify the global navigation and standardize empty-state copy.

1. NAVBAR: rewrite apps/web/src/components/Navbar.tsx based on auth state and role.

   PUBLIC visitor (not logged in):
   - Logo → /
   - Explore → /explore
   - How it works → /#how-it-works
   - Sign in → /login (button, primary style)

   AUTHENTICATED tourist:
   - Logo → /
   - Explore → /explore
   - My Trips → /dashboard (renamed from "Dashboard" — more user-language)
   - My Proofs → /proofs
   - Profile dropdown: Profile, Settings, Sign out

   AUTHENTICATED guide (users.role = 'guide'):
   - Logo → /
   - My Bookings → /guide/dashboard
   - My Profile → /guide/[id] (their own)
   - Profile dropdown: Settings, Sign out

   AUTHENTICATED admin (users.role = 'admin'):
   - Logo → /
   - Admin → /admin
   - Profile dropdown: Sign out

2. REMOVE forever:
   - DAO link (already deleted in A4 but verify no traces).
   - "Vibe" link (now /proofs).
   - Any link to /quests.
   - Any link to features that don't exist.

3. MOBILE: hamburger menu collapses everything except logo. Hamburger contents = same items as desktop nav, full-screen overlay, large tap targets (≥56px).

4. EMPTY STATES — standardize across the app:
   - Never write "0 X". Always write "No X yet." with a constructive next action.
   - Examples:
     - /explore (no filter matches): "No routes match your filters. Try a different region or difficulty."
     - /proofs (no proofs): "Your trek proofs will appear here. Complete a trek to mint your first one." + "Browse routes →" CTA.
     - /dashboard (no trips): "No trips yet. Pick a route to start your first journey." + "Browse routes →" CTA.
     - /guide/[id] (no reviews): "No reviews yet. Be the first to trek with {name}."
     - Leaderboard: "Few travelers ranked yet. Complete treks to climb the leaderboard."

5. Create apps/web/src/components/EmptyState.tsx:
   - Props: title, description, actionLabel, actionHref, icon (optional)
   - Use across all empty states for consistency.

6. ROLE detection: read user role from public.users via Supabase server query in the layout.tsx; pass to Navbar via context. Don't rely on NEXT_PUBLIC_ADMIN_PUBKEY for role checks.

DO NOT TOUCH:
- The auth flow itself (handled in C1).
- Any data fetching beyond the role lookup.

Acceptance:
- Public visitor sees only Explore / How it works / Sign in.
- Authenticated tourist sees their three relevant links.
- Authenticated admin sees only the Admin link plus profile.
- No empty state contains "0".
- Mobile nav is a clean overlay with large tap targets.

Pitfalls:
- Race condition: client-side role check might briefly show wrong nav before hydration. Render conservatively (assume tourist) and update on hydration; or better, get role from server.
- Don't trust client state alone for admin checks — always re-verify server-side in admin routes.
- Mobile menu must close on navigation (often missed; use route change listener).
```

**Acceptance criteria:**
- Nav adapts to auth state and role correctly.
- No empty state shows "0".
- Mobile nav works.

**Risks:**
- Hydration mismatch on role-dependent UI.

---

## C. Auth (clean up the existing flow)

---

### C1. Collapse onboarding to 2 steps and refine wallet linking

**Purpose:** The 4-step onboarding (Identity → Passport → Treasury → Embark) is theater. Two steps is enough. Wallet linking should be optional until the first booking.

**Prompt:**
```
Simplify the onboarding flow and clarify when authentication is needed.

1. REWRITE apps/web/src/app/onboard/page.tsx as a 2-step flow:
   STEP 1 — "Create your account"
     - Email + password OR "Continue with Google" (Supabase OAuth)
     - On success: insert/upsert public.users with id=auth.uid(), email, display_name (from email if blank), role='tourist'
     - This step uses a Supabase trigger on auth.users INSERT to auto-create the public.users row — so the client doesn't need to do this manually.
   STEP 2 — "Connect a wallet (optional)"
     - "Connect Phantom" or "Connect Solflare" buttons
     - "Skip for now" link — wallet is only required when actually booking.
     - On connect: prompt the user to sign a message; POST to /api/auth/link-wallet to verify and persist.

2. DELETE the "Passport" and "Treasury" and "Embark" steps. They're ceremonial.

3. CLARIFY WHEN AUTH IS REQUIRED — implement these gates:
   - PUBLIC (no auth): /, /explore, /route/[id], /guide/[id], /how-it-works, /proof/[mintAddress] (public proof permalinks)
   - AUTHENTICATED (Supabase session): /dashboard, /trek/[bookingId], /profile, /proofs (their own)
   - WALLET REQUIRED (auth + linked wallet): /book/[serviceId], any check-in or signing action
   - ADMIN ONLY: /admin/*

4. Update apps/web/src/middleware.ts to enforce:
   - Redirect unauthenticated → /login?next=<path>
   - For wallet-required routes: if authenticated but no wallet, redirect to /link-wallet?next=<path>
   - For admin routes: query users.role server-side; if not admin, redirect to /dashboard

5. Build apps/web/src/app/link-wallet/page.tsx:
   - Single-page wallet connect prompt
   - Reads next= query param to redirect after success
   - Shows: "TourChain needs to link your wallet so funds you put into escrow can be released safely. We never see your private key."
   - One button: "Connect Phantom"

6. The wallet link API (POST /api/auth/link-wallet):
   - Already exists per audit — verify it has:
     - Single-use nonce stored in a Supabase table `auth_nonces` (NOT in-memory Set)
     - Nonce expiration: 5 minutes
     - Signature verification via tweetnacl
     - UNIQUE constraint on users.wallet_address (returns 409 if duplicate)
     - Rate limit: 5/min per user (NOT in-memory; use Upstash or Supabase counter — see F3)

7. Migration to add auth_nonces table (if not present):
   CREATE TABLE auth_nonces (
     nonce TEXT PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT now(),
     expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
     used BOOLEAN DEFAULT false
   );
   CREATE INDEX ON auth_nonces (user_id, created_at DESC);

8. UX details:
   - Auth feels invisible on public pages.
   - Wallet feels like a payment method, not an identity.
   - Don't ask for wallet at signup — it's a barrier and unnecessary until they actually book.

DO NOT TOUCH:
- The Solana programs.
- The booking logic itself.

Acceptance:
- New user signs up via email, lands on /dashboard, no wallet required.
- "Connect wallet" appears as an optional step.
- Trying to /book/[serviceId] without a wallet redirects to /link-wallet.
- Wallet-already-linked-elsewhere returns 409 with a clear message.

Pitfalls:
- The Supabase trigger on auth.users → public.users must exist; if not, create it. Without it, OAuth users have auth records but no app profile.
- Nonces stored in Supabase, NOT in-memory (the audit flagged this; the in-memory Set fails on serverless cold starts).
- Don't lowercase base58 wallet addresses — case matters.
- Validate `next` param: must start with "/" and not contain "//" to prevent open-redirect.
```

**Acceptance criteria:**
- 2-step onboarding works end-to-end.
- Wallet linking happens lazily, only when needed.
- Nonces persist across cold starts.

**Risks:**
- Missing Supabase trigger leaves orphaned auth users.
- Open redirect via unvalidated `next`.

---

## D. Core Booking, Escrow, Check-in, Proof, Reputation

---

### D1. Implement /book/[serviceId] booking + escrow funding flow

**Purpose:** The first transaction the tourist makes. Must be fast, clear, and trustworthy.

**Prompt:**
```
Build the booking flow at apps/web/src/app/(app)/book/[serviceId]/page.tsx and the supporting API routes /api/booking/prepare and /api/booking/confirm.

Think like a tourist: "I'm about to send money to a stranger. I want to know exactly what's happening at every step."

1. /book/[serviceId] — single-page wizard with 4 steps:

   STEP 1 — REVIEW:
     - Service details: route name, guide name + reputation, dates, what's included, total price in USD
     - "Continue" button

   STEP 2 — DATES:
     - Date picker for start_date (no past dates, no >12 months out)
     - Number of travelers (1-max_group_size)
     - Auto-compute end_date = start_date + duration_days
     - "Continue"

   STEP 3 — CONNECT WALLET:
     - If wallet not linked: redirect to /link-wallet?next=/book/[serviceId]
     - Show wallet address (truncated), balance in SOL
     - If balance < required: link to https://faucet.solana.com or `solana airdrop` instruction
     - "Continue when ready"

   STEP 4 — CONFIRM AND FUND:
     - Summary line: "{N} travelers × ${price} = ${total} USD ≈ {sol_amount} SOL"
       - Conversion: hardcode 1 SOL = $150 for devnet (TODO comment for V1: real Pyth or CoinGecko price)
     - Milestones: equal to count of route_checkpoints, capped at 4 (so 5+ checkpoints become 4 milestones)
     - "Sign and fund escrow" primary button
     - Below: "What happens next: funds are held in a Solana escrow. They release to your guide milestone-by-milestone as you complete checkpoints."

2. ON CONFIRM, the client:
   a. POST /api/booking/prepare with { serviceId, startDate, partySize, milestones, amountLamports }
   b. Server creates a `bookings` row with status='pending', generates created_at timestamp, computes escrow PDA, returns { bookingId, escrowPda, instructionSerialized, expectedAmountLamports }
   c. Client deserializes the instruction, signs with wallet, sends via @solana/web3.js sendAndConfirmTransaction
   d. On confirmation, POST /api/booking/confirm with { bookingId, txSignature }
   e. Server verifies tx on-chain, confirms escrow PDA holds expected lamports, updates bookings row status='confirmed', sets escrow_pda and escrow_tx_signature
   f. Redirect to /trek/[bookingId]

3. /api/booking/prepare/route.ts:
   - Auth required
   - Validate body with zod (serviceId uuid, startDate ISO, partySize 1-20, milestones 1-10, amountLamports positive)
   - Look up service; verify is_active and guide is_verified
   - Compute escrow PDA via the same seeds as the program: ["escrow", tourist.key(), guide.key(), created_at.to_le_bytes()]
   - Build the create_escrow instruction
   - Insert bookings row in 'pending' state
   - Return { bookingId, escrowPda, instructionSerialized (base64), expectedAmountLamports, createdAt }

4. /api/booking/confirm/route.ts:
   - Auth required, must own the booking
   - Validate { bookingId, txSignature }
   - Confirm tx via connection.confirmTransaction
   - Verify the escrow PDA exists on-chain and tourist+amount match expectations
   - Update bookings: status='confirmed', escrow_tx_signature, escrow_pda (already set in prepare)
   - Return success with /trek/[bookingId] redirect

5. ERROR STATES:
   - User rejects wallet signature → "You cancelled the signature. Your booking has not been created."
   - Network failure → "Funding failed. The booking is in pending state. Try again from your dashboard or contact support."
   - Insufficient balance → "Wallet balance too low. Top up at faucet.solana.com and try again."
   - Tx confirmed but /api/booking/confirm fails → server should retry confirmation up to 3 times before flagging the booking for admin review.

6. SUCCESS SCREEN (or transition to /trek/[bookingId]):
   - "Booking confirmed!"
   - Solana Explorer link to the create_escrow tx
   - "Continue to your trek dashboard →"

7. CLEAN-UP JOB: a Supabase Edge Function that runs every hour to clean up bookings stuck in 'pending' state for > 1 hour (delete them; they're orphaned attempts).

DO NOT TOUCH:
- The escrow Anchor program.
- The middleware (already redirects to /link-wallet when needed).

Acceptance:
- A user with a funded devnet wallet completes booking in under 90 seconds.
- bookings row in Supabase has status='confirmed' and escrow_pda populated.
- Escrow vault PDA on devnet holds the SOL.
- On rejection/failure, user gets a clear, actionable error message.
- No 'pending' bookings older than 1 hour remain.

Pitfalls:
- created_at byte order in PDA seeds: must be little-endian and match the program exactly. A tiny mismatch = silent failure.
- Schema drift in bookings table: the audit flagged total_price_usd vs total_price vs amount_sol fallback. Pick ONE schema per the latest migration and remove the fallback logic.
- Race: user signs, tx fails before /confirm fires. The cleanup job + retry on confirm handle this.
- Don't compute escrow PDA on the client — always recompute server-side and verify match.
- Zod schema must reject negative amounts, future-impossible dates, and >max_group_size party sizes.
```

**Acceptance criteria:**
- Real booking creates real escrow on devnet.
- Failures handled gracefully.
- No orphaned pending bookings.

**Risks:**
- PDA seed mismatch.
- Schema fallback hiding real bugs.

---

### D2. Implement /trek/[bookingId] active trek view + GPS/QR check-in

**Purpose:** During the trek, the tourist needs a single mobile-friendly screen showing progress and the next action.

**Prompt:**
```
Build apps/web/src/app/(app)/trek/[bookingId]/page.tsx and /api/checkin/route.ts.

Think like a trekker on the trail: "I'm at a waypoint. I have spotty signal. I just want to tap a button and prove I'm here."

1. /trek/[bookingId] page (mobile-first, server-side data fetch):
   - Booking + route + route_checkpoints + places + check_ins for this booking
   - Auth required; user must be the tourist on this booking
   - If status != 'active' or 'confirmed': redirect to /dashboard

2. LAYOUT (mobile-first):
   - Top: route name, guide name, "Day X of Y"
   - Progress bar: completed checkpoints / total
   - Map: route polyline; completed markers green, current yellow, future gray
   - "Next checkpoint" card prominent:
     - Place name, altitude, distance from current GPS (if browser geolocation enabled)
     - "Check in here" button (large, primary, sticky on mobile)
     - Disabled state: "{distance}m away — get within 500m"
     - Enabled state: "Check in at {place_name}"
   - Below: full checkpoint list (completed / active / upcoming)

3. CHECK-IN FLOW:
   - Tap "Check in here" → request browser geolocation
   - Compute haversine distance to checkpoint coordinates
   - If > 500m: error toast "Move closer to {place} ({d}m away)"; button stays disabled
   - If within 500m: POST /api/checkin with { bookingId, placeId, lat, lng, accuracy }
   - On success: confetti animation, "Checked in!", reload progress
   - If GPS denied: fallback to QR scan (see step 5)

4. /api/checkin/route.ts:
   - Auth required
   - Validate input with zod
   - Verify user owns the booking
   - Verify the place is in this booking's route_checkpoints AND not already checked into for this booking (UNIQUE on booking_id + place_id)
   - SERVER-SIDE recompute haversine using place.latitude/longitude from DB; reject if > 500m. Do NOT trust client distance claim.
   - Insert check_ins row with method='gps', verified=true
   - If this completes all required checkpoints, return completion_ready=true

5. QR FALLBACK (lib/qr.ts is currently a stub; implement it):
   - QR code at each physical checkpoint contains: HMAC-SHA256({placeId}{date}, SECRET)
   - Daily token rotation (HMAC includes date) so QR codes can't be reused indefinitely
   - Fixed-rotation guarantees the same code valid all day; partner business prints once per day
   - POST /api/checkin/qr-verify with { bookingId, scannedToken } → server validates HMAC, inserts check_ins with method='qr'

6. MILESTONE RELEASE:
   - After every check-in, calculate which milestones are unlocked: milestones_completed = floor(checkpoints_completed * milestones / total_checkpoints)
   - Show "Release milestone payment" button if pending milestone released < unlocked
   - Clicking: starts dual-sig flow:
     a. Tourist signs → server stores partially-signed tx in `pending_milestone_releases` table (TTL 24h)
     b. Guide is notified (Supabase realtime; visible in their dashboard)
     c. Guide co-signs → server submits to chain
     d. Booking row updated; tx signature shown with Solana Explorer link
   - For MVP, allow admin to act as the second signer if the guide doesn't sign within 24h.

7. FINAL COMPLETION:
   - Once all checkpoints checked in and final milestone released: "Complete trek and mint proof" button
   - Calls complete_booking instruction (dual-sig same flow), then auto-triggers POST /api/proof/mint

8. MOBILE UX:
   - Sticky bottom bar with primary action.
   - Battery and signal aware: assume the user is on 3G with 20% battery.
   - Don't auto-refresh frequently (drains battery).
   - Optimistic UI: show check-in as pending immediately, confirm when API returns.

DO NOT TOUCH:
- The escrow program.
- The proof program.
- The booking flow.

Acceptance:
- A user can check in via GPS or QR within 500m of a checkpoint.
- Check-in count increments in Supabase and visible immediately.
- Milestone release tx lands on devnet (with admin co-sign for MVP).
- Mobile UX is usable on a real phone.

Pitfalls:
- Geolocation permission denied: show clear path to QR fallback, don't make GPS the only option.
- GPS spoofing: server-side haversine is the gate; client can't be trusted.
- Browser geolocation accuracy varies (10-100m typical, 100m+ with GPS off). The 500m radius accommodates this.
- QR HMAC secret must be in server env (CHECKIN_HMAC_SECRET), not in NEXT_PUBLIC_.
- UNIQUE check_ins constraint: booking_id + place_id prevents double check-in. If user accidentally re-taps, return 200 idempotently.
- Realtime notifications: use Supabase realtime channels for the guide's pending releases.
- Don't allow check-ins outside booking date window (start_date - 1 day to end_date + 1 day).
```

**Acceptance criteria:**
- GPS check-in works on a real phone.
- QR check-in is a working fallback.
- Milestone releases hit the chain.
- Mobile-friendly.

**Risks:**
- Dual-sig coordination complexity.
- HMAC secret leakage.

---

### D3. Implement /api/proof/mint and /proofs page

**Purpose:** Close the loop. The tourist gets a permanent on-chain artifact.

**Prompt:**
```
Implement proof minting and display.

Think like the tourist: "I just finished a trek. I want to see my proof and share it."

1. /api/proof/mint/route.ts:
   - Auth required
   - Body: { bookingId }
   - Validate with zod
   - Server checks (all must pass):
     - booking belongs to current user
     - booking.status = 'completed'
     - all required route_checkpoints have verified check_ins
     - completion_proofs has NO existing row for this booking (idempotency)
   - Build cNFT metadata JSON:
     {
       name: "{route.name} Completion",
       symbol: "TREK",
       description: "Verified on-chain proof of completing {route.name} on {completed_at}",
       image: "{route.image_url or platform default}",
       attributes: [
         { trait_type: "Route", value: route.name },
         { trait_type: "Region", value: route.region },
         { trait_type: "Duration", value: "{N} days" },
         { trait_type: "Guide", value: guide_display_name },
         { trait_type: "Completed", value: ISO date },
         { trait_type: "Checkpoints", value: "{N}/{N}" }
       ],
       external_url: "https://tour-chain.vercel.app/proof/{mintAddress}"
     }
   - Upload metadata JSON to Supabase Storage bucket 'proof-metadata' (public-read), get URL
   - Load platform keypair from SOLANA_PLATFORM_KEYPAIR env (base58)
   - Call tourchain_proof.mint_completion_proof with metadata.uri = the Supabase Storage URL
   - On success, insert completion_proofs row with nft_mint_address, mint_tx_signature, metadata_uri
   - Return { mintAddress, txSignature, explorerUrl, proofPageUrl }

2. /proofs page (renamed from /vibe in A4):
   - Auth required
   - Server fetch completion_proofs WHERE user_id = current_user
   - Each card: route image, route name, completion date, "View on Solana →" link, "Share" button (copies /proof/[mint] URL)
   - Empty state: "Your trek proofs will appear here. Complete a trek to mint your first one." + "Browse routes →" CTA

3. PUBLIC PERMALINK at /proof/[mintAddress]:
   - Public route, no auth
   - Server fetch by nft_mint_address
   - Show the proof card with full metadata, route info, guide info
   - OG tags for social sharing (og:image = route image, og:title = "I completed {route} on TourChain", og:description = ...)
   - Solana Explorer link
   - Footer: "Verified on Solana devnet. Built with TourChain."

4. ERROR STATES on /api/proof/mint:
   - Booking not completed → 400 "Trek must be completed before minting proof"
   - Already minted → 409 "Proof already minted: /proof/{existingMint}"
   - Merkle tree not configured → 500 "Proof minting unavailable. Contact support." (log to Sentry)
   - Bubblegum CPI failure → retry up to 3 times, then 500 with details to admin

5. The platform keypair must NEVER be logged. Wrap any logging that touches transaction-building code to redact base58 strings of length > 80.

DO NOT TOUCH:
- The proof Anchor program.
- The Merkle tree (already initialized in A3).

Acceptance:
- After completing a real trek, /api/proof/mint mints a cNFT to the tourist's wallet.
- /proofs displays the cNFT with metadata.
- /proof/[mintAddress] is publicly shareable with correct OG tags.
- Re-minting the same booking returns 409.

Pitfalls:
- Without the Merkle tree (A3), all mints fail. Verify NEXT_PUBLIC_MERKLE_TREE is set in Vercel.
- Metadata URI must be publicly fetchable. Supabase Storage public-read or Arweave both work.
- Don't allow re-minting; UNIQUE constraint on completion_proofs.booking_id.
- Compressed NFTs don't show up in all wallets — Phantom does, but Solflare may not. Provide an explorer link as the canonical view.
- Storage bucket must have RLS allowing service_role to write and anon to read.
```

**Acceptance criteria:**
- Real cNFT mint after a completed trek.
- /proofs displays it.
- /proof/[mint] is shareable with OG tags.

**Risks:**
- Tree exhaustion at scale (~16K mints).
- Platform keypair leakage in logs.

---

### D4. Implement review submission and on-chain reputation update

**Purpose:** Closes the trust feedback loop. Without this, guide reputation never updates.

**Prompt:**
```
Build /api/reviews and the review UI.

1. UI: on /trek/[bookingId] when booking.status='completed':
   - "Leave a review for {guide_name}" form
   - Star rating (1-5)
   - Comment textarea (min 10, max 2000 chars)
   - Submit button

2. /api/reviews/route.ts (POST):
   - Auth required
   - Validate body with zod
   - Verify: booking belongs to user, status='completed', no existing review (UNIQUE on booking_id + reviewer_id)
   - Insert reviews row with on_chain_updated=false
   - Trigger reputation sync:
     - Server loads platform keypair (admin)
     - Calls tourchain_reputation.update_reputation(score) where score is the rating 1-5
     - On success: reviews.on_chain_updated=true, store the tx signature
     - On failure: keep on_chain_updated=false; a background worker retries
   - Return { reviewId, onChainTx }

3. BACKGROUND RETRY:
   - Create a Supabase Edge Function `reputation-sync` that runs every 15 minutes
   - Finds reviews where on_chain_updated=false AND created_at > now() - 7 days
   - Retries the on-chain update, max 3 attempts per review
   - After 3 failures, log to admin_actions table for manual review

4. After submission, refresh the materialized view:
   - Trigger on reviews INSERT: REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard
   - Or schedule a cron via Supabase Edge Functions every 5 minutes

5. UI feedback:
   - Show submitted review immediately
   - "Your review has been recorded. The guide's on-chain reputation will update within minutes."
   - Show "View on Solana →" link once on_chain_updated=true (poll or use realtime subscription)

6. Update /guide/[id] page to display the new review at the top of the reviews list.

DO NOT TOUCH:
- The reputation Anchor program.
- The booking flow.

Acceptance:
- After completing a trek, tourist can leave a review.
- Review appears on guide's profile.
- Guide's on-chain reputation reflects the new score (visible on Solana Explorer).
- Failed on-chain updates retry automatically.

Pitfalls:
- Don't double-count: UNIQUE on (booking_id, reviewer_id) and idempotency check before on-chain call.
- The on-chain instruction is admin-signed; never let the user submit on-chain reputation directly.
- Concurrent materialized view refresh prevents read locks.
- Score validation: 1-5 only; reject 0 or 6+.
- Don't expose the platform keypair in the API response or logs.
```

**Acceptance criteria:**
- Review → guide reputation update visible on-chain.
- Failed updates retry without manual intervention.

**Risks:**
- Background retry loop on broken instructions.
- Score inflation if duplicates not prevented.

---

## E. Admin & Safety

---

### E1. Build /admin guide verification queue

**Purpose:** Trust starts here. No guide on the platform without admin approval.

**Prompt:**
```
Build apps/web/src/app/(admin)/admin/guides/page.tsx and supporting API routes.

1. Auth: middleware enforces users.role='admin'.

2. THREE TABS:
   a. "Pending verification" — guides where is_verified=false AND license_document_url IS NOT NULL
      - Each row: display_name, license_number, document link, applied_at, wallet linked Y/N
      - "Approve" button:
        - If wallet not linked: disable + tooltip "Guide must link wallet before approval"
        - If linked: POST /api/admin/verify-guide → marks is_verified=true, sets verified_at, verified_by; calls tourchain_reputation.initialize_guide on-chain
      - "Reject" button: opens modal for rejection reason; updates guides with rejection note (don't delete the user account)

   b. "Active guides" — is_verified=true AND is_suspended=false
      - Search by name; sort by created_at, completed_treks, score
      - "View profile" → /guide/[id]
      - "Suspend" button: confirms intent; calls tourchain_reputation.suspend_guide on-chain; sets is_suspended=true with reason

   c. "Suspended" — is_suspended=true
      - "Reinstate" button: calls tourchain_reputation.reinstate_guide

3. /api/admin/verify-guide/route.ts:
   - Admin-only (verified server-side)
   - Validate { guideId, action: 'approve' | 'reject' | 'suspend' | 'reinstate', reason? }
   - Execute corresponding Supabase update + on-chain call
   - Insert admin_actions row for every action: { admin_id, action_type, target_type='guide', target_id, notes, on_chain_tx, timestamp }
   - Return { success, onChainTx? }

4. AUDIT LOG VIEW at /admin/actions:
   - Read-only table of admin_actions, paginated, sortable
   - Filter by admin, action type, date range

5. UX details:
   - Show counts on each tab badge (e.g., "Pending (3)")
   - Confirm destructive actions with a modal
   - Show transaction signature with Solana Explorer link after each on-chain action

DO NOT TOUCH:
- The reputation program.
- Guide self-service edit flows.

Acceptance:
- Admin can approve a guide; on-chain initialize_guide tx confirmed.
- Admin can suspend; on-chain suspend_guide tx confirmed.
- Every admin action logged in admin_actions.
- /admin/actions shows audit trail.

Pitfalls:
- Approving a guide without a linked wallet fails at initialize_guide. Show the inline error instead of crashing.
- Don't delete user accounts on rejection — preserve the audit trail.
- The platform keypair signs admin instructions. Verify it's loaded only server-side.
```

**Acceptance criteria:**
- Full guide lifecycle from admin panel.
- All actions logged.

**Risks:**
- Admin keypair compromise = total platform control. Encrypted env only.

---

### E2. Build /admin/disputes for dispute resolution

**Purpose:** Without dispute resolution, the escrow trust collapses.

**Prompt:**
```
Build the dispute admin panel and resolution flow.

1. /admin/disputes page:
   - List open disputes (status='open' or 'under_review')
   - SLA tracker at top: "{N} disputes open > 48 hours" highlighted red
   - Each card:
     - Booking summary, route, dates, both parties
     - Filer (tourist or guide), category, description
     - Evidence URLs (signed Supabase Storage URLs, time-limited)
     - Booking history: check_ins timeline, milestones_completed, on-chain escrow status
   - Actions:
     a. "Approve full refund" → resolve_dispute with tourist_refund_bps=10000
     b. "Approve partial" → admin enters bps (0-10000); resolve_dispute called
     c. "Dismiss" → status='resolved_dismissed', no on-chain action
   - Each action requires resolution_notes (required field, min 20 chars)

2. /api/admin/resolve-dispute/route.ts:
   - Admin-only
   - Validate input
   - Verify on-chain escrow status='Disputed' before action
   - Call resolve_dispute on-chain (admin keypair signs)
   - Update disputes row (resolved_by, resolved_at, status)
   - Notify both parties via Supabase realtime + email if configured
   - Insert admin_actions row
   - Return { onChainTx, resolution }

3. DISPUTE FILING (existing route POST /api/disputes — verify):
   - Tourist or guide can file
   - Required fields: bookingId, category, description (min 50 chars), evidenceUrls (max 5)
   - Calls open_dispute on-chain (freezes escrow)
   - Notifies admin via realtime

4. BOTH PARTIES VIEW:
   - Tourist sees their disputes at /dashboard/disputes
   - Guide sees their disputes at /guide/dashboard/disputes
   - Read-only status view; updates in realtime

5. Evidence storage:
   - Supabase Storage bucket 'dispute-evidence', private (signed URL access only)
   - Max file size: 10MB per file
   - Allowed types: image/*, video/mp4, application/pdf

DO NOT TOUCH:
- The escrow program (resolve_dispute is already implemented).
- Tourist or guide booking flows.

Acceptance:
- Admin can resolve a real dispute on devnet.
- Escrow PDA state changes accordingly (verifiable on Solana Explorer).
- Both parties see resolution in real time.
- Evidence files only accessible via signed URLs, not publicly listable.

Pitfalls:
- resolve_dispute on-chain only works if escrow status='Disputed'. Verify before calling.
- Don't expose evidence_urls to the public — use signed URLs from Supabase Storage.
- Notifying users requires their email or realtime subscription; handle missing email gracefully.
```

**Acceptance criteria:**
- End-to-end dispute resolution working.
- Audit trail preserved.

**Risks:**
- Single admin can drain disputed escrows; consider 2-of-2 admin sigs for V2.

---

### E3. Replace in-memory rate limiter and nonce store; add safety guards

**Purpose:** The audit flagged in-memory rate limiting and nonce storage as broken on serverless. Replace with Supabase-backed (or Upstash-backed) implementations.

**Prompt:**
```
Replace in-memory security primitives with persistent ones.

1. RATE LIMITING — replace apps/web/src/lib/api/handle.ts in-memory limiter:

   Option A (preferred if available): use @upstash/ratelimit + Vercel KV. Setup:
     npm install @upstash/ratelimit @upstash/redis
     Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel env.
     Create apps/web/src/lib/rate-limit.ts exporting helpers per route.

   Option B (no Upstash): create Supabase table `rate_limits`:
     CREATE TABLE rate_limits (
       key TEXT PRIMARY KEY,
       count INT NOT NULL DEFAULT 0,
       window_start TIMESTAMPTZ NOT NULL DEFAULT now()
     );
     CREATE INDEX ON rate_limits (window_start);
     Implement sliding-window logic in a SQL function for atomicity.

2. APPLY rate limits per route:
   /api/auth/link-wallet — 5/min per IP
   /api/checkin — 10/min per user
   /api/checkin/qr-verify — 10/min per user
   /api/booking/prepare — 20/min per user
   /api/booking/confirm — 20/min per user
   /api/reviews — 10/min per user
   /api/proof/mint — 5/min per user
   /api/disputes — 5/hour per user
   /api/admin/* — 60/min per admin

3. NONCE STORE — replace in-memory Set with auth_nonces table (created in C1).

4. SAFETY GUARDS on /api/checkin:
   - Server-side haversine using place coordinates from DB (already; verify)
   - UNIQUE constraint on check_ins (booking_id, place_id) — add migration if missing
   - Reject check-ins outside booking date window: start_date - 1 day to end_date + 1 day
   - Detect impossible travel: if previous check-in was < 1h ago and is > 50km away (linear), flag the booking suspicious_booking=true

5. SAFETY GUARDS on /api/proof/mint (already partially done, verify):
   - All required checkpoints have verified check_ins
   - No existing completion_proof for this booking
   - booking.status='completed'
   - Refuse mint on suspicious_booking=true (admin must clear flag first)

6. ADD a flagged_activity table:
   CREATE TABLE flagged_activity (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'check_in', 'review', 'user')),
     entity_id UUID NOT NULL,
     reason TEXT NOT NULL,
     severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
     created_at TIMESTAMPTZ DEFAULT now(),
     resolved_at TIMESTAMPTZ,
     resolved_by UUID REFERENCES users(id)
   );

7. /admin/flagged page (new tab in admin):
   - List unresolved flagged_activity
   - Per row: entity link, reason, severity, "Mark resolved" or "Take action"

DO NOT TOUCH:
- Solana programs.
- Tourist/guide flows beyond the API layer.

Acceptance:
- Rate limit survives serverless cold starts.
- Nonces persist across deploys.
- Suspicious patterns visible in admin /flagged tab.
- Booking date window enforced on check-ins.

Pitfalls:
- Upstash adds a service dependency; Supabase-backed is portable but slower (~50ms per request). For a 13-day demo, Supabase is fine.
- False positives on flagged_activity for legitimate guides who travel between Kathmandu and Lukla — tune thresholds (50km/h flat is a starting point, refine based on data).
- Don't surface "suspicious" status to users; only admin sees it.
```

**Acceptance criteria:**
- Rate limiting reliable on serverless.
- Nonces don't reset on cold start.
- Suspicious patterns flagged for admin review.

**Risks:**
- False positives blocking real users.
- Aggressive rate limits killing legitimate flows.

---

## F. Tests & Hardening

---

### F1. Anchor program test coverage

**Purpose:** Critical financial logic must be tested before any real money flows.

**Prompt:**
```
Add or expand Anchor tests for all three programs to cover happy path + at least one failure case per instruction. Use anchor-bankrun or litesvm for fast in-memory testing.

1. tests/tourchain_reputation/:
   - initialize_guide: success, double-init rejection, non-admin rejection
   - update_reputation: success (score=1, score=5), score=0 rejection, score=6 rejection, suspended-guide rejection, overflow check
   - suspend_guide: success, non-admin rejection
   - reinstate_guide: success, non-admin rejection

2. tests/tourchain_escrow/:
   - Full lifecycle: create_escrow → activate → release_milestone (×N) → complete_booking; assert vault balance at each step
   - cancel_booking: success when Funded, rejection when Active
   - open_dispute → resolve_dispute with bps=0, 5000, 10000
   - Failure: release_milestone twice for same milestone (status check)
   - Failure: complete_booking before all milestones released
   - Failure: non-tourist tries cancel_booking
   - Edge: dispute_deadline scenario

3. tests/tourchain_proof/:
   - initialize_proof_authority: success, non-admin rejection, double-init rejection
   - mint_completion_proof: success (mock Bubblegum), non-admin rejection, name-too-long rejection, uri-too-long rejection

4. CI workflow .github/workflows/anchor.yml:
   - Triggers on PR + push to main
   - Steps: checkout, install solana CLI, install anchor, anchor build, anchor test
   - Cache: target/ and ~/.cache/solana/

5. All tests must run in under 60 seconds total (litesvm makes this realistic).

DO NOT TOUCH:
- Production frontend.

Acceptance:
- `anchor test` passes locally and in CI.
- Each instruction has at least 1 happy + 1 failure test.
- CI runs them on every PR with green status.

Pitfalls:
- Bubblegum CPI in litesvm requires fixture data; may need to mock the CPI return rather than execute the full bubblegum stack.
- Test wallets need devnet airdrops or precomputed keypairs in fixtures.
- CI cache busting: Anchor.toml hash should be part of the cache key.
```

**Acceptance criteria:**
- All Anchor tests pass.
- CI runs them on every PR.

**Risks:**
- Bubblegum mocking complexity.
- CI runtime explosion.

---

### F2. Frontend integration tests for the core loop

**Purpose:** Catch UI regressions on the path that matters.

**Prompt:**
```
Add Vitest + React Testing Library tests for critical flows.

1. apps/web/tests/booking-flow.test.tsx:
   - Mocks Supabase responses + Solana wallet adapter
   - Renders /book/[serviceId] with seeded service
   - Walks through 4 steps
   - Asserts /api/booking/prepare and /api/booking/confirm called with correct payloads

2. apps/web/tests/checkin.test.tsx:
   - Mocks browser geolocation (vi.stubGlobal)
   - Renders /trek/[bookingId] with partially-completed booking
   - Tests: button disabled when far away, enabled when within 500m
   - Asserts POST /api/checkin called with correct lat/lng

3. apps/web/tests/auth-redirect.test.tsx:
   - Tests middleware: unauthenticated → /login, no-wallet → /link-wallet, non-admin → /dashboard from /admin

4. apps/web/tests/explore.test.tsx:
   - Mocks Supabase 5-route response
   - Asserts cards render, filter changes update visible cards, URL params update

5. apps/web/tests/guide-profile.test.tsx:
   - Mocks Supabase + on-chain reputation fetch
   - Renders /guide/[id]
   - Asserts reputation displays, "View on Solana" link correct, suspended banner shows when applicable

6. CI workflow .github/workflows/web.yml:
   - On PR + push to main
   - Steps: checkout, install Node, npm ci, npm run typecheck, npm run lint, npm test, npm run build

DO NOT TOUCH:
- Solana program tests.

Acceptance:
- All tests pass in CI.
- Coverage of booking, check-in, auth, explore, guide profile.

Pitfalls:
- Mocking @supabase/ssr requires careful vi.mock setup at the top of test files.
- Geolocation API needs stubbed navigator.geolocation.
- Wallet adapter mocking: prefer integration tests against a local validator over unit tests with extensive mocks for wallet flows.
```

**Acceptance criteria:**
- Critical flows tested.

**Risks:**
- Brittle mocks → flaky tests.

---

### F3. Mobile QA pass on every key page

**Purpose:** Tourists trekking will use phones. The product must work on phones.

**Prompt:**
```
Run a mobile QA pass on every key page using Chrome DevTools mobile emulation (iPhone 14, Pixel 7). Document findings and fix in same commit.

Pages:
- / (landing)
- /explore
- /route/[id]
- /guide/[id]
- /login, /signup, /onboard, /link-wallet
- /book/[serviceId]
- /trek/[bookingId]
- /proofs
- /dashboard

For each page verify:
- No horizontal scroll at 375px width
- All CTAs reachable in bottom 1/3 of viewport (thumb zone)
- Tap targets ≥ 44x44px
- Forms work with mobile keyboard (correct inputmode for email, tel, decimal)
- Mapbox renders and is interactive (pan/zoom; rotation disabled)
- Loading states visible on slow 3G (Network throttling)
- Modals/dialogs don't get clipped at the top
- No overlapping text or elements

Specific concerns:
- /trek/[bookingId] check-in button must be reachable while on mobile, ideally sticky bottom bar
- /book/[serviceId] step transitions don't lose state on back-button
- /explore split-screen collapses cleanly to vertical stack
- iOS Safari: date pickers, position:sticky, viewport units (use 100dvh, not 100vh)

Test on at least one real device:
- A real Android phone via Chrome (use chrome://inspect)
- iOS Safari via Vercel preview URL on actual iPhone

Fix every issue found. Common fixes:
- Add `min-w-0` to flex children that overflow
- Replace 100vh with 100dvh
- Add inputmode="numeric" or inputmode="email" where appropriate
- Add loading="lazy" to images below the fold
- Use next/image for all hero images

DO NOT TOUCH:
- Backend or programs.

Acceptance:
- Every key page works at 375px width with no horizontal scroll.
- Booking flow completable on a real phone.
- Check-in usable with one hand on a phone.

Pitfalls:
- Mapbox on mobile can be janky — disable rotation and pitch on small screens.
- Modal dialogs and date pickers behave differently on iOS Safari; test specifically.
- Position:sticky breaks inside scrollable parents — verify sticky CTAs work.
```

**Acceptance criteria:**
- Full flow completable on phone.

**Risks:**
- iOS-specific bugs.

---

## G. Demo Polish

---

### G1. Seed and pin a visible demo journey

**Purpose:** Show, don't tell. A first-time visitor sees a real completed trek with verifiable on-chain artifacts.

**Prompt:**
```
Create a demo journey that proves the loop end-to-end and surface it on the landing page.

1. Create scripts/seed-demo-journey.ts:
   On devnet, with admin keypair:
   - Create a demo tourist user "Maya Sherpa" (insert into users with role='tourist', is_demo=true) — generate a fresh keypair as the wallet
   - Pick the "Annapurna Base Camp" route (4 checkpoints assumed for this demo)
   - Create a booking by the demo tourist with the first verified guide, status='confirmed'
   - Fund the escrow on-chain (use admin keypair to sign on behalf of demo tourist for simulation)
   - Insert 4 verified check_ins (one per checkpoint), method='gps', verified=true
   - Release each milestone on-chain (admin co-signs)
   - Complete the booking on-chain
   - Mint the completion proof cNFT to the demo tourist's wallet
   - Insert a 5-star review from the demo tourist
   - Trigger reputation update on-chain
   - Print all transaction signatures and the final cNFT mint address
   - Save the artifact data to demo-journey.json:
     {
       bookingId, escrowPda, escrowTxSig,
       milestoneTxSigs: [...],
       completionTxSig,
       proofMint, proofMintTxSig,
       reputationUpdateTxSig,
       guideId, guidePda
     }

2. ADD an `is_demo` column to bookings, completion_proofs, reviews if not present (BOOLEAN DEFAULT false). Mark all demo data with is_demo=true.

3. EXCLUDE demo data from public stats by default:
   - Update the stats query in /api/stats: WHERE is_demo=false
   - Leaderboard view: WHERE is_demo=false
   - But ALLOW the demo data to be visible on the public proof permalink and in the demo section.

4. ADD a "Recently completed" section on the landing page (between hero and how-it-works):
   - Reads from demo-journey.json (committed to repo, public artifact)
   - Renders one card:
     - Route image, "Annapurna Base Camp"
     - "Maya completed this trek with [Guide Name]"
     - Three Solana Explorer links: escrow, completion, proof mint
     - "View full proof →" → /proof/[mintAddress]
   - Visually marked: subtle "Demo journey on Solana devnet" badge at the corner.

5. DO NOT publish the demo tourist's private key. The demo must be readable evidence, not reproducible by anyone.

6. After seeding, ensure /proofs page (when logged in as demo user, not normally accessible) shows the proof. Public /proof/[mintAddress] always works.

DO NOT TOUCH:
- Real user data.
- The Anchor programs.

Acceptance:
- Landing page shows one verifiable completed trek.
- Three Solana Explorer links resolve to real on-chain transactions.
- /proof/[mintAddress] for the demo proof is publicly viewable and shareable.
- Production stats counters do NOT include demo data unless explicitly opted in.

Pitfalls:
- Don't run the seed twice without cleanup — make the script idempotent (check for existing demo data before creating).
- Demo data leaking into leaderboard would inflate rankings — verify is_demo=false filter everywhere.
- The script needs the platform admin keypair to fully simulate the dual-sig flow; document that clearly.
```

**Acceptance criteria:**
- Visible proof of the loop on the landing page.
- Verifiable on Solana Explorer.

**Risks:**
- Demo data contaminating real metrics.

---

### G2. Record the 2-minute demo video and embed it

**Purpose:** A judge or investor watches a video and gets the product in 2 minutes.

**Prompt:**
```
Produce final demo video and add it to the landing page.

1. Record a 2-minute screen capture using OBS or Loom:
   00:00–00:15 — Landing page; read the headline; click "Browse routes"
   00:15–00:30 — /explore; show the map and routes; click Annapurna Base Camp
   00:30–00:50 — /route/[id]; show route details, checkpoints, guides; click "Book with [guide]"
   00:50–01:10 — /book/[serviceId]; walk through the 4 steps; sign tx in Phantom; show success
   01:10–01:25 — /trek/[bookingId]; show progress bar; demonstrate (or fast-forward) check-in
   01:25–01:40 — Show milestone release tx; show completion; show "Mint proof" success
   01:40–01:55 — /proofs; show the cNFT card; click "View on Solana →"
   01:55–02:00 — Solana Explorer showing the mint; cut to landing

2. Audio: voice-over, calm, slow. Or no voice with music + on-screen captions. Captions are mandatory for accessibility.

3. Host the video:
   - Upload to Vimeo (paid; better controls) or YouTube (unlisted)
   - Or upload as MP4 to Vercel Blob / Supabase Storage public bucket
   - Get a stable URL

4. Embed on the landing page:
   - Add a "See it in action" section between hero and how-it-works
   - Use a click-to-play poster image (do not autoplay, do not background-loop)
   - Lazy-load: <iframe loading="lazy"> or video element with preload="none"

5. Add the same video link to:
   - README.md (top of file)
   - GitHub repository description
   - docs/audit.md as a reference

6. ADD "Verify on-chain" footer section on landing:
   - Reputation program: Solana Explorer link
   - Escrow program: link
   - Proof program: link
   - Demo escrow PDA: link to the actual demo journey escrow account
   - Demo proof mint: link to the actual cNFT

7. Update README screenshots — replace any old screenshots with current production-state screenshots.

DO NOT TOUCH:
- Anything else.

Acceptance:
- 2-minute video accessible from landing page and README.
- All claims on landing have verifiable on-chain links.
- Video has captions.

Pitfalls:
- Don't autoplay video — it's annoying and slows page load.
- Don't host the video file directly in the Next.js public folder — it bloats the build. Use external hosting or blob storage.
- Captions are accessibility-required; do not skip them.
```

**Acceptance criteria:**
- Submission-ready demo asset.

**Risks:**
- Video file size hurting page performance.

---

## Execution Order

Run prompts strictly in order:

1. **A1 → A2 → A3** — fix production data, env vars, Merkle tree (this alone makes the demo real)
2. **A4 → A5** — delete scope drift and zero-counters
3. **B1 → B2 → B3 → B4 → B5** — rebuild user-facing pages
4. **C1** — collapse onboarding, fix wallet linking
5. **D1 → D2 → D3 → D4** — implement the booking → check-in → proof → review loop
6. **E1 → E2 → E3** — admin and safety
7. **F1 → F2 → F3** — tests and mobile QA
8. **G1 → G2** — demo polish

The single highest-leverage prompt is **A1**. Run it first, even if you run nothing else today. Empty database is the root cause of every visible failure.