TourChain — Full Product Audit                                                                                                                               
                                                                                                                                                               
  Live demo: https://tour-chain.vercel.app/ | Repo: https://github.com/Bikashkc613/Tour_chain | Audited: May 2, 2026                                           
                                                                                                                                                               
  ---             
  A. Executive Summary                                                                                                                                         
                      
  TourChain is a Solana-powered trust layer for Nepal's trekking economy — and the architecture to support that vision is genuinely real: three deployed Anchor
   programs, a PostgreSQL schema with RLS, a structured booking-to-proof pipeline, and a clean Next.js 15 frontend. The engineering is sound. The demo is      
  empty. Every counter reads zero. The map has no routes. The /quests page 404s. The core loop — browse route → book guide → fund escrow → check in → release
  funds → mint proof — is implemented in code and completely invisible in the live product. The team has built more than they are showing, and that is a       
  solvable problem. But the current state of the demo actively undermines the product's credibility. The next action is not to build a new feature; it is to
  make the existing infrastructure visible.

  ---
  B. Current Product Identity
                             
  The most honest framing: TourChain is a trust and proof platform for adventure tourism, using Solana as infrastructure rather than as the product. The
  blockchain is plumbing. The product is: verified guides, milestone escrow, GPS-confirmed check-ins, and cNFT proofs.                                         
   
  What it currently presents as: A premium-looking Web3 brand with zero data.                                                                                  
                  
  What it is trying to become: The booking and trust layer for Nepal's trekking economy — a system where guides own their reputation on-chain, tourists can't  
  get scammed on payment, and trek completions are permanently verifiable.
                                                                                                                                                               
  Is the identity coherent? Mostly, at the code level. Not at the demo level. The live site has a /dao page (explicitly out-of-scope per strategy), dual       
  branding ("Tourism Chain Nepal" in the page title vs "TourChain" in the repo), a /vibe page (a cute name for what the strategy calls completion_proofs), and
  a /quests page that returns 404. The navigation promises four things (Explore, Dashboard, Vibe, DAO) and delivers none of them with real data.               
                  
  Is it a quest game, tourism app, trust platform, or Solana app? It is trying to be all four simultaneously. That is the core confusion. The answer: it is a  
  tourism trust platform with gamification on top. The gamification (XP, streaks, challenges, leaderboard) is overbuilt relative to the trust core, which is
  itself undemonstrated.                                                                                                                                       
                  
  ---
  C. Live Demo Audit
                    
  ┌────────────┬─────────────────────────────────────────────────────────────────────┬───────────────┬─────────────────────────────────────────────────────┐
  │    Page    │                            What you see                             │   What it     │                       Problem                       │   
  │            │                                                                     │    proves     │                                                     │
  ├────────────┼─────────────────────────────────────────────────────────────────────┼───────────────┼─────────────────────────────────────────────────────┤   
  │ (landing)  │ counters all at 0                                                 │ vision         │                                                    │  
  ├────────────┼───────────────────────────────────────────────────────────────────┼────────────────┼────────────────────────────────────────────────────┤     
  │ /explore   │ Filter UI (5 regions, 4 difficulty levels), empty map area, "0    │ Filter UI      │ Seed not applied to production DB; Mapbox token    │  
  │            │ Verified Routes Available"                                        │ works          │ missing from Vercel                                │     
  ├────────────┼───────────────────────────────────────────────────────────────────┼────────────────┼────────────────────────────────────────────────────┤  
  ├────────────┼─────────────────────────────────────────────────────────────┼───────────────┼───────────────────────────────────────────────────────────┤     
  │ /dashboard │ Redirects to /login — clean login + signup links            │ Auth routing  │ Nothing demonstrable without an account                   │
  │            │                                                             │ works         │                                                           │     
  ├────────────┼─────────────────────────────────────────────────────────────┼───────────────┼───────────────────────────────────────────────────────────┤
  │ /vibe      │ NFT proof gallery UI, "0 NFTs," "Live on Solana Devnet"     │ UI exists     │ No proofs ever minted; the "live on devnet" badge is      │     
  │            │ badge                                                       │               │ ironic                                                    │
  ├────────────┼─────────────────────────────────────────────────────────────┼───────────────┼───────────────────────────────────────────────────────────┤     
  │            │                                                           │                   │ strategy docs; it is still shipping                      │    
  ├────────────┼───────────────────────────────────────────────────────────┼───────────────────┼──────────────────────────────────────────────────────────┤
  │ /quests    │ 404                                                       │ Nothing           │ Route is in the nav-adjacent code but the page does not  │    
  │            │                                                           │                   │ exist                                                    │
  ├────────────┼───────────────────────────────────────────────────────────┼───────────────────┼──────────────────────────────────────────────────────────┤    
  │ /onboard   │ 4-step wizard: Identity → Passport → Treasury → Embark    │ Onboarding flow   │ Cannot test without wallet; 4 steps is theater           │
  │            │                                                           │ exists            │                                                          │    
  └────────────┴───────────────────────────────────────────────────────────┴───────────────────┴──────────────────────────────────────────────────────────┘    
   
  First impression: High-quality visual design. The typography (Playfair Display + DM Sans), color palette (himalayan-blue, trekker-orange), and motion        
  (particles, parallax) signal a serious product.
                                                                                                                                                               
  Clarity of value prop: The hero tagline — "Trustless bookings, verifiable experiences, reputation layer for the world's highest trails" — is specific and    
  good. The three support cards (Trustless Escrow, Experience Registry, XP & Leaderboard) are coherent. The problem is immediately beneath: all three counters
  at zero.                                                                                                                                                     
                  
  Does the flow make sense? There is no flow. Routes → null. Booking → unreachable. Escrow → never funded. Check-in → never triggered. Proof → never minted.   
  The loop is architecturally complete and experientially absent.
                                                                                                                                                               
  Does the demo feel real? No. It feels like a well-designed staging environment that someone forgot to seed. A product that exists only as brand.             
   
  Does the demo prove the product? It proves UI skill. It proves zero transactions, zero routes, zero guides, zero completed treks.                            
                  
  Is the demo coherent with the codebase? Partially. The code is ahead of the demo in nearly every dimension — the backend is wired, the programs are deployed,
   the API routes exist. The demo shows nothing that the code can do.
                                                                                                                                                               
  ---             
  D. Codebase Audit
                   
  Frontend (Next.js 15, apps/web/)
                                                                                                                                                               
  Confirmed:
                                                                                                                                                               
  - 23 page routes, all created. /quests is absent from the file tree — the page simply does not exist, explaining the 404.                                    
  - src/app/page.tsx — Hero fetches stats from /api/stats (real Supabase call), but the Supabase production project is empty, so it returns zeros. The counters
   are real code, not hardcoded zeros. The data is the problem.                                                                                                
  - src/lib/quests.ts — 6 quests are hardcoded in TypeScript, not in the database. Quest definitions (Sunrise Hunter, Altitude Ace, Culture Keeper, Social
  Trekker, Legendary Circuit, Explorer) are arrays in source code. The /api/quests route uses MOCK_PROGRESS — quest progress is not synced to Supabase.        
  - src/app/(auth)/explore/page.tsx — Mapbox GL JS is imported but NEXT_PUBLIC_MAPBOX_TOKEN is not set in the Vercel deployment. Map area is empty. Routes
  query calls Supabase but the production DB has no rows.                                                                                                      
  - src/components/Navbar.tsx — Nav links: Explore, Dashboard, Vibe, DAO. /quests is not in the nav; /challenges is not in the nav. These pages exist in the
  router but are not linked.                                                                                                                                   
  - src/lib/demo/catalog.ts — An explicit demo catalog file exists. This is a stub for fake data. It should either be wired to the seed or deleted.
  - Two map libraries: leaflet@1.9.4 + react-leaflet@4.2.1 AND mapbox-gl@3.22.0. Only one map library should exist. This is bloat.                             
  - src/lib/qr.ts — Placeholder file for QR generation/verification. Not implemented.                                                                          
  - src/components/SOSButton.tsx — Emergency SOS button exists. Whether the API route behind it (POST /api/sos) does anything meaningful is not confirmed.     
  - Hero testimonials — 4 entries, auto-rotate 4s. These are mock data in the component. Not from Supabase.                                                    
                                                                                                                                                               
  Security / trust issues:                                                                                                                                     
                                                                                                                                                               
  - src/lib/api/handle.ts — Rate limiter is in-memory (Map<key, { count, resetAt }>). This resets on every Vercel serverless cold start. It provides no        
  production protection against brute force — it just looks like it does.
  - Nonce replay protection uses an in-memory Set that auto-clears at 5k entries — same problem.                                                               
  - GPS spoofing: the 500m Haversine gate in /api/checkin is the only verification. Easy to fake with a spoofed GPS coordinate. This is the weakest trust link 
  in the chain.                                                                                                                                                
  - NEXT_PUBLIC_ADMIN_PUBKEY in public env — admin role check is partially client-side. On-chain enforcement in the escrow program is the real gate; the       
  client-side check is just UX.                                                                                                                                
                  
  API surface — 20+ routes, split into:                                                                                                                        
                  
  - Auth: POST /api/auth/link-wallet                                                                                                                           
  - Booking: GET|POST /api/bookings, GET /api/bookings/[bookingId], POST /api/booking/prepare
  - Check-in: POST /api/checkin, POST /api/checkin/qr-verify                                                                                                   
  /api/challenges/[id]/leaderboard                                                                                                                             
  - Content: GET|POST /api/quests, GET|POST /api/stories, POST /api/stories/[id]/vote, POST /api/stories/[id]/comments                                         
  - Proofs: GET /api/proofs, POST /api/proof/mint                                                                                                              
  - Disputes: GET|POST /api/disputes                                                                                                                           
  - Utilities: GET /api/weather, GET /api/places, GET /api/routes, GET /api/services, GET /api/actions, POST /api/sos                                          
                                                                                                                                                               
  The booking API has schema fallback logic — total_price_usd → total_price → amount_sol. This means the schema migrated mid-development and the API was       
  patched to handle both old and new column names. The schema is drifting from the API expectations. This will cause silent data bugs.                         
                                                                                                                                                               
  Backend / Database (Supabase)                                                                                                                                
                  
  Confirmed:                                                                                                                                                   
                  
  - 4 migration files in /supabase/migrations/ (root) + 1 in /apps/web/supabase/ — migrations split across two directories, which is a maintenance hazard.     
  - Core tables confirmed: users, guides, places, routes, route_checkpoints, quests, services, bookings, check_ins, reviews, disputes, completion_proofs.
  - RLS policies exist for all major tables — correct pattern.                                                                                                 
  - 0004_seed.sql exists but has not been applied to the production Supabase project. This is confirmed by "0 routes found" on the live explore page.          
  - 0006_gamification_features.sql is in apps/web/supabase/, not in the root supabase/migrations/ — this migration may not be tracked by the Supabase CLI for  
  the production project.                                                                                                                                      
                                                                                                                                                               
  Issues:                                                                                                                                                      
  - Quest definitions are hardcoded in lib/quests.ts but there is also a quests table in the DB schema. These are two sources of truth for the same data. The
  DB version wins; delete the hardcoded version once seeded.                                                                                                   
  - No evidence of database indexing strategy — bookings, check_ins, and reviews tables will need indexes on foreign keys before any real traffic.
  - No Supabase Edge Functions observed — all server logic is in Next.js API routes. This is fine; just note that the README's "Supabase with Edge Functions"  
  description is aspirational, not current.                                                                                                                    
                                                                                                                                                               
  Solana Programs (programs/)                                                                                                                                  
                                                                                                                                                               
  Confirmed from Anchor.toml:
                                                                                                                                                               
  ┌──────────────────────┬──────────────────────────────────────────────┐                                                                                      
  │       Program        │                  Devnet ID                   │
  ├──────────────────────┼──────────────────────────────────────────────┤                                                                                      
  │ tourchain_reputation │ BxgSbUELdL9cCj4hETtFJqyzDqFeRKAYefWBnVpDXk3L │
  ├──────────────────────┼──────────────────────────────────────────────┤
  │ tourchain_escrow     │ B1M6gHx7W2tKPWwEEuKaumyk2H8zdETZGoBCDt9yamrt │                                                                                      
  ├──────────────────────┼──────────────────────────────────────────────┤                                                                                      
  │ tourchain_proof      │ EvRzd8MXqxojEmn4jViXv8NyxVXoU3X1gEuSv1tw9qML │                                                                                      
  └──────────────────────┴──────────────────────────────────────────────┘                                                                                      
                  
  Escrow program — correct design: create_escrow → activate → release_milestone → approve_milestone → completion or dispute → refund. Milestone count 1–10.    
  Dual-sig (tourist + guide) for milestone release. Dispute deadline field exists.
                                                                                                                                                               
  Reputation program — guide-owned PDAs (not platform-revocable). Score stored as total_score / total_reviews. Suspension requires admin authority.            
   
  Proof program — Bubblegum CPI for cNFT minting. Merkle tree must be initialized separately via init-merkle-tree.ts. Unknown whether this was done on devnet. 
  If the Merkle tree was not initialized, POST /api/proof/mint will fail silently.
                                                                                                                                                               
  Unknown / risks:
  - Whether the Merkle tree was created on devnet (no evidence either way from the demo).
  - Whether IDLs in apps/web/src/lib/solana/idl/ match the current deployed program versions. IDL drift = transaction failures with confusing errors.          
  - Test coverage for the escrow program under edge cases: what happens if dispute_deadline passes and neither party acts?                           
                                                                                                                                                               
  Deployment / Config                                                                                                                                          
                                                                                                                                                               
  Known Vercel environment gaps:                                                                                                                               
  - NEXT_PUBLIC_MAPBOX_TOKEN — missing (map blank)
  - Production Supabase seed — not applied ("0 routes")                                                                                                        
  - Potentially: program IDs not in Vercel env vars (they're in Anchor.toml but need to be in .env.production)
                                                                                                                                                               
  Migration directory split — root /supabase/migrations/ vs apps/web/supabase/ — is a deployment risk. The supabase db push command will only pick up one path.
                                                                                                                                                               
  ---                                                                                                                                                          
  E. What Is Working                                                                                                                                           
                    
  1. Three Anchor programs deployed to devnet with real program IDs.
  2. Supabase schema with RLS is well-designed and matches the product's data model.                                                                           
  3. Frontend deploys cleanly to Vercel. All pages load.                                                                                                       
  4. Auth routing works — /dashboard correctly redirects to /login.                                                                                            
  5. Email auth + wallet signature linking flow is implemented and architecturally sound.                                                                      
  6. Booking → escrow preparation (POST /api/booking/prepare) correctly derives PDAs and returns transaction parameters.                                       
  7. GPS check-in validation (Haversine, 500m) is server-side — correct pattern.                                                                               
  8. Zod validation on all POST bodies.                                                                                                                        
  9. Role-based access (tourist / guide / admin) enforced in RLS and middleware.                                                                               
  10. Visual design is genuinely strong — above bar for any demo context.                                                                                      
  11. CI configured in .github/workflows/.                                                                                                                     
  12. README accurately describes the current architecture.                                                                                                    
                                                                                                                                                               
  ---                                                                                                                                                          
  F. What Is Broken
                                                                                                                                                               
  1. Production Supabase is empty. 0004_seed.sql was never run against the hosted project. Every page reads zero.
  2. Mapbox token missing in Vercel. /explore map is blank. This is the most visible first-impression failure.                                                 
  3. /quests returns 404. The page does not exist. It is in the nav concept but not in the file system. Any link to it is dead.                                
  4. In-memory rate limiter. Resets on cold start. Provides no real protection in production serverless environment.                                           
  5. Schema drift in booking API. total_price_usd → total_price → amount_sol fallback is a silent bug waiting to corrupt booking data.                         
  6. Quest progress not persisted. /api/quests uses MOCK_PROGRESS. Completing a quest step does not update the database.                                       
  7. Merkle tree initialization unknown. If init-merkle-tree.ts was not run on devnet, POST /api/proof/mint will fail for every user.                          
  8. 0006_gamification_features.sql split. This migration may not be tracked by the production Supabase CLI run, leaving gamification tables missing.          
  9. Two map libraries. Both Leaflet and Mapbox are in package.json. This doubles the map bundle and signals unresolved technical decisions.                   
  10. QR verification is a stub. src/lib/qr.ts is a placeholder. QR check-in (POST /api/checkin/qr-verify) exists as a route but the actual verification logic 
  is not implemented.                                                                                                                                          
  11. Hero testimonials are hardcoded mock data. Four fake testimonials auto-rotate on the landing page.                                                       
                                                                                                                                                               
  ---             
  G. What Is Missing                                                                                                                                           
                    
  1. Populated production database. The single most impactful missing item.
  2. /quests page. Listed conceptually, absent in the file system.                                                                                             
  3. Guide profile page (/guide/[id]). There is no publicly viewable guide page that shows on-chain reputation, completed treks, and bookable services. This is
   the core trust artifact and it doesn't exist as a standalone page.                                                                                          
  4. One demonstrable end-to-end transaction on devnet — a Solana Explorer link to a real booking escrow creation, a real milestone release, a real proof mint.
  5. Demo mode / guest path. A visitor without a wallet cannot witness the loop. There should be a "Demo Booking" visible without auth.                        
  6. Solana Explorer deep-links on any page that references on-chain state. No evidence the programs have ever been called.                                    
  7. QR code generation and verification (src/lib/qr.ts is a stub).                                                                                            
  8. Mobile QA pass. Framer Motion parallax and heavy map libraries frequently break on mobile.                                                                
  9. Error states. What happens when the wallet is disconnected mid-booking? When GPS fails? Currently unknown.                                                
  3. Guide profile page (/guide/[id]). There is no publicly viewable guide page that shows on-chain reputation, completed treks, and bookable services. This is
   the core trust artifact and it doesn't exist as a standalone page.
  4. One demonstrable end-to-end transaction on devnet — a Solana Explorer link to a real booking escrow creation, a real milestone release, a real proof mint.
  5. Demo mode / guest path. A visitor without a wallet cannot witness the loop. There should be a "Demo Booking" visible without auth.
  6. Solana Explorer deep-links on any page that references on-chain state. No evidence the programs have ever been called.
  7. QR code generation and verification (src/lib/qr.ts is a stub).
  8. Mobile QA pass. Framer Motion parallax and heavy map libraries frequently break on mobile.
  9. Error states. What happens when the wallet is disconnected mid-booking? When GPS fails? Currently unknown.
  10. Admin panel for verifying guides, seeding routes, and resolving disputes. Without this, the platform cannot onboard real operators.

  ---
  H. What Is Fake / Placeholder / Overbuilt

  Fake (hardcoded data presented as real):
  - Three landing counters (0/0/0) — fetched from Supabase but DB is empty. They read as real metrics but prove zero activity.
  - 4 hero testimonials — hardcoded in component, not from database. Users who don't exist.                                   
  - src/lib/demo/catalog.ts — an explicit demo catalog. Not wired to production data.      
                                                                                                                                                               
  Placeholder (not implemented):                                                                                                                               
  - src/lib/qr.ts — stub file, no logic.                                                                                                                       
  - /quests page — doesn't exist.                                                                                                                              
  - Quest progress — MOCK_PROGRESS in the quests API. Not persisted.
  - Merkle tree for cNFTs — unknown whether initialized; if not, the proof minting system is completely non-functional.                                        
                                                                                                                                                               
  Overbuilt (beyond what the core loop needs):                                                                                                                 
  - Gamification system — XP, levels (500 XP/level, 6 tiers), streaks, challenges, leaderboard. This is a significant surface area on top of a core loop that  
  hasn't been demonstrated once.                                                                                                                               
  - Stories system (/stories, /stories/new, votes, comments) — user-generated narratives. Nice-to-have, not core to trust.                                     
  - Weather integration — GET /api/weather + WeatherWidget.tsx. Useful but secondary.                                                                          
  - Referral system (/referral, src/lib/referral.ts) — premature for a zero-user platform.                                                                     
  - DAO page — explicitly out of scope per strategy; still shipping.                                                                                           
  - 4-step onboarding — "Identity → Passport → Treasury → Embark" is ceremony. Two steps (wallet + email) is enough.                                           
  - Two map libraries — Leaflet and Mapbox. Pick one and delete the other.                                                                                     
                                                                                                                                                               
  ---                                                                                                                                                          
  I. What Should Be Removed or Simplified                                                                                                                      
                                                                                                                                                               
  ┌─────────────────────────────────────────┬─────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
  │                  Item                   │         Action          │                                  Reason                                  │             
  ├─────────────────────────────────────────┼─────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ /dao page + all DAO code                │ Delete                      │ Explicitly removed from strategy; still shipping; causes scope confusion │         
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ src/lib/quests.ts hardcoded quest array │ Delete after seeding DB     │ Duplicate source of truth with quests table                              │         
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ MOCK_PROGRESS in /api/quests            │ Replace with DB query       │ Quest progress is not persisted                                          │         
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ src/lib/demo/catalog.ts                 │ Delete                      │ Seed the DB instead of maintaining a fake catalog                        │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Leaflet or Mapbox (pick one)            │ Delete one                  │ Two map libraries = doubled bundle, unresolved decision                  │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ report.md (stale)                       │ Archive or delete           │ Describes pre-refactor architecture with 9 programs + Express            │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ claude-session.jsonl                    │ .gitignore or delete        │ Internal tooling artifact; shouldn't be in the repo                      │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ 4-step onboarding                       │ Collapse to 2 steps         │ Wallet connect + email. Passport/Treasury steps are theater              │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Hero testimonials                       │ Replace with real or remove │ Fake testimonials on a trust platform are a trust problem                │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Referral system                         │ Defer                       │ Premature for a zero-user platform                                       │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Stories/social system                   │ Defer                       │ Secondary to the core trust loop                                         │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ DAO nav item                            │ Remove from Navbar          │ Dead page; confusing navigation                                          │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Dual branding                           │ Pick one name               │ "Tourism Chain Nepal" in page title vs "TourChain" everywhere else       │
  ├─────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤         
  │ Migration split                         │ Consolidate                 │ Move apps/web/supabase/migrations/0006_* into root supabase/migrations/  │
  └─────────────────────────────────────────┴─────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘         
                  
  ---                                                                                                                                                          
  J. What the Product Should Really Be
                                      
  A trust-first booking platform where:
  - Tourists find and book verified Nepal trekking guides through a clean map interface                                                                        
  - Payments go into a Solana escrow released milestone-by-milestone as the trek progresses                                                                    
  - GPS check-ins at real waypoints verify the trek is happening                                                                                               
  - Guide reputation lives on-chain, not on a platform-controlled database that can be edited                                                                  
  - Completion generates a permanent cNFT proof of the trek                                                                                                    
                                                                                                                                                               
  That is five sentences. That is the product. Everything else is decoration.                                                                                  
                                                                                                                                                               
  The single sentence for the landing page:                                                                                                                    
                  
  ▎ "Book a verified Nepal trekking guide, pay into a trustless escrow, prove your journey on-chain."                                                          
                  
  Three things a visitor should be able to do in 30 seconds:                                                                                                   
  1. See real routes on a real map, with region and difficulty filters
  2. Click into a real guide profile showing on-chain reputation score, completed treks, and a "Book" button                                                   
  3. See one completed booking with a Solana Explorer link to the escrow transaction and the minted cNFT    
                                                                                                                                                               
  If those three things are possible, TourChain is real. They are not currently possible.                                                                      
                                                                                                                                                               
  ---                                                                                                                                                          
  K. Recommended MVP                                                                                                                                           
                    
  The MVP is not a feature set — it is the smallest demonstration that the core loop works end-to-end with real data.
                                                                                                                                                               
  First (this week, in order):                                                                                                                                 
  1. Run all migrations (including 0006) against production Supabase using supabase db push --linked                                                           
  2. Run 0004_seed.sql — populate 5 routes, 15 places, 3 guide profiles, services                                                                              
  3. Add NEXT_PUBLIC_MAPBOX_TOKEN to Vercel environment — map renders, routes appear
  4. Wire the landing-page counters to real Supabase COUNT() queries — they'll show real numbers (small, but real)                                             
                                                                                                                                                               
  Second (next 3 days):                                                                                                                                        
  5. Build /guide/[id] page — public, no auth, shows guide name, on-chain reputation score (from PDA or fallback to DB), specialties, active services, and a   
  "Book" button                                                                                                                                                
  6. Verify the Merkle tree was initialized on devnet; if not, run scripts/init-merkle-tree.ts                                                                 
  7. Execute one full end-to-end booking with a test wallet: create-escrow → activate → approve-milestone → release → mint proof. Record all transaction       
  signatures.                                                                                                                                                  
  8. Add one real entry to /vibe from that proof mint. Add one Solana Explorer link from the landing page.                                                     
                                                                                                                                                               
  Third (polish, before any demo):                                                                                                                             
  9. Delete /dao, report.md, demo catalog, hardcoded testimonials, duplicate map library                                                                       
  10. Collapse onboarding to 2 steps                                                                                                                           
  11. Replace fake testimonials with empty state or remove section
  12. Record a 2-minute video walking the loop                                                                                                                 
                                                                                                                                                               
  ---                                                                                                                                                          
  L. Recommended Next 7 Days                                                                                                                                   
                            
  ┌─────┬─────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
  │ Day │                          Task                           │                          Done when                          │                              
  ├─────┼─────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ 1   │ Consolidate migrations, run against production Supabase    │ /explore shows ≥5 routes with real data                     │                           
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ 1   │ Add Mapbox token to Vercel                                 │ Map renders on /explore                                                 │               
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 2   │ Build /guide/[id] page                                     │ One guide profile is publicly viewable with on-chain score              │               
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 2   │ Verify/initialize Merkle tree on devnet                    │ init-merkle-tree.ts confirmed run; PDA exists                           │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 3   │ Execute full devnet booking with test wallet               │ Escrow transaction signature exists on Solana Explorer                  │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 4   │ Advance booking to completion; mint one proof              │ cNFT visible on /vibe; Solana Explorer link on landing page             │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 5   │ Wire counters to real DB counts; delete /dao               │ Counters show non-zero numbers; /dao returns 404                        │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 6   │ Fix in-memory rate limiter (swap to Upstash)               │ Rate limiting survives serverless cold starts                           │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 6   │ Consolidate to one map library; delete lib/demo/catalog.ts │ Bundle reduced                                                          │
  ├─────┼────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤               
  │ 7   │ Delete stale artifacts; collapse onboarding; mobile QA     │ /report.md gone; onboarding is 2 steps; every key page passes on mobile │
  └─────┴────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘               
                  
  ---                                                                                                                                                          
  M. Final Verdict
                  
  What this is now: A technically coherent prototype with zero production evidence. The architecture is sound. The demo is empty.
                                                                                                                                                               
  What it should become: A trust layer for Nepal trekking, proven by at least one real transaction on Solana and one visible guide with a real reputation      
  score.                                                                                                                                                       
                                                                                                                                                               
  Is the product direction sound? Yes. The framing — "tourism trust with Solana as plumbing, not as the pitch" — is correct. Nepal's cash-based, paper-permit  
  trekking industry has a real scam and trust problem. On-chain escrow and portable guide reputation are real solutions to real problems. This is not a
  looking-for-a-problem blockchain project.                                                                                                                    
                  
  Is the codebase a demo, prototype, or near-product? Near-product at the code level. Prototype at the demo level. The gap between them is entirely operational
   — environment variables and a database seed, not engineering.
                                                                                                                                                               
  Should the team narrow scope before building more? Yes, immediately. The gamification layer (XP, streaks, challenges, leaderboard, referrals, stories) is    
  substantial engineering sitting on top of a core loop that has never been publicly demonstrated. Every hour spent adding to the gamification system before
  the core loop is visible in production is misdirected. The leaderboard ranking means nothing if there are zero completed treks. Stop building. Seed the      
  database. Run the loop once. Then decide what to build next.

  Biggest risk: Confusing architectural completeness with product completeness. The three Anchor programs are real, the schema is real, the API routes are real
   — and none of it is visible in the live demo. The team can show you the repo and it looks impressive. A judge or investor will open tour-chain.vercel.app
  and see zeros. They will leave. The gap between those two experiences is the entire problem.                                                                 
                  
  The work is real. Make it visible. Then narrow, not expand.