# TourChain — Refactor Blueprint

Source of truth: `tourchain-strategy.md`
Target: Next.js 15 + Supabase + 3 Anchor programs
Current: Next.js 16 + Express/MongoDB + 9 Anchor programs (8 stubs) + broken SDK

This document is execution, not strategy. Every item is file-specific.

---

## 1. Repository Cleanup Summary

The repo has three structural problems:

1. **Two backends doing the same job.** `backend/` (Express + Mongoose + MongoDB, port 3001) duplicates what Supabase + Next.js API routes should own. One route crashes on invocation (`actions.js:64`, undefined `connection`), three have zero auth, one falls back to a Windows-only keypair path.
2. **Seven dead Anchor programs.** Only `tourism_registry` is deployed. `booking_escrow` and `experience_nft` are partial. `loyalty_token`, `dao_governance`, `route_registry`, `carbon_credits`, `pricing_oracle`, `sos_insurance` are stubs carrying maintenance cost and program IDs without shipping anything.
3. **A broken SDK.** `sdk/src/index.ts` initializes every program with `{} as Idl`. Every call through it fails at runtime. `sdk/src/booking.ts` is corrupted/binary.

After cleanup: `apps/web/` (Next.js 15 monolith), `programs/{tourchain_reputation, tourchain_escrow, tourchain_proof}`, `supabase/` (migrations + edge functions). `backend/` and `sdk/` disappear. Seven program directories disappear.

---

## 2. What to Delete

### Backend (entire tree)

| Path | Reason | Replacement |
|---|---|---|
| `backend/` (entire directory) | Replaced by Supabase + Next.js API routes | Supabase tables + RLS + Next.js `app/api/*` |
| `backend/src/services/solanaService.js` | Backend-held keypair signing user TXs is an anti-pattern; Windows path crash | Users sign from wallet; platform keypair only for admin-only ops |
| `backend/src/services/bubblegumService.js` | Depends on `MERKLE_TREE_PUBKEY` that is never provisioned | `tourchain_proof` program + `scripts/init-merkle-tree.ts` |
| `backend/src/models/{Tourist,Place,Visit}.js` | Mongoose models | Supabase tables `users`, `places`, `check_ins` |
| `backend/src/routes/actions.js` | Crashes on undefined `connection`; hardcoded treasury | DELETE |
| `backend/src/routes/auth.js` | No wallet signature verification | Supabase Auth + `apps/web/src/lib/auth/wallet.ts` |
| `backend/src/routes/places.js` | No auth on create | Supabase table + admin-only RLS |
| `backend/src/routes/visits.js` | MongoDB-backed | `check_ins` table + `/api/checkin` route |
| `backend/src/routes/nfts.js` | Returns `localhost:3001` URLs | `completion_proofs` table + Arweave URIs |
| `backend/src/routes/leaderboard.js` | MongoDB aggregation | Postgres materialized view |

### Anchor programs (seven deletions, two renames)

| Path | Action |
|---|---|
| `programs/loyalty_token/` | DELETE — empty `earn_trek`; tokens out of scope |
| `programs/dao_governance/` | DELETE — duplicate-vote exploit; DAO out of scope |
| `programs/route_registry/` | DELETE — routes/checkpoints live in Supabase |
| `programs/carbon_credits/` | DELETE — out of scope |
| `programs/pricing_oracle/` | DELETE — manual pricing in `services` table |
| `programs/sos_insurance/` | DELETE — any-signer payout bug; out of scope |
| `programs/experience_nft/` | DELETE — replaced by `tourchain_proof` with proper Bubblegum CPI |
| `programs/tourism_registry/` | RENAME → `programs/tourchain_reputation/` (preserve keypair/program ID where possible) |
| `programs/booking_escrow/` | RENAME → `programs/tourchain_escrow/` (preserve keypair/program ID where possible) |

### SDK

| Path | Reason |
|---|---|
| `sdk/` (entire directory) | Empty IDLs break every call; only consumer is `apps/web`; internal SDK = pure maintenance cost. `apps/web` imports IDLs directly from `target/idl/*.json` |
| `sdk/src/booking.ts` | Corrupted/binary file |

### Frontend dead paths

| Path | Action |
|---|---|
| Hardcoded dashboard stats (`"1,248 tourists"`, `"4,520 SOL in escrow"`) | Replace with Supabase queries or delete card |
| `apps/web/src/app/book/[operatorId]/page.tsx` static data | Rewire to `services` + `guides` queries |

### Config

| Path | Reason |
|---|---|
| `Anchor.toml` wallet `~\.config\solana\id.json` | Windows backslashes fail on Linux/macOS |
| `rust-toolchain.toml` pinned to `1.89.0` | Pre-release; flaky builds |
| Any `.env` committed to git | Secret leak |

---

## 3. What to Replace

| Old | New |
|---|---|
| Express server on `:3001` | Next.js API routes at `apps/web/src/app/api/*` |
| MongoDB + Mongoose | Supabase Postgres with RLS |
| Backend keypair signing user TXs | User-signed TXs via wallet adapter; platform keypair only for admin ops |
| `MERKLE_TREE_PUBKEY` env var (never set) | `scripts/init-merkle-tree.ts` runs once, writes to `.env.local` |
| `sdk/` with empty IDLs | `apps/web/src/lib/solana/idl/*.json` from `target/idl/` |
| Hardcoded Devnet RPC | `NEXT_PUBLIC_SOLANA_RPC` + `NEXT_PUBLIC_SOLANA_CLUSTER` |
| Hardcoded Mapbox token in `Map.tsx:8` | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| `console.log` logging | Structured logging via Vercel/Supabase logs |
| `cors()` wildcard | Same-origin (monolith), no CORS needed |

---

## 4. What to Keep and Refactor

### Rename + rewrite

| Current | New | Changes |
|---|---|---|
| `programs/tourism_registry/` | `programs/tourchain_reputation/` | Fixed-size `name: [u8; 64]`; add `is_suspended`, `is_verified`; admin-only `update_reputation`; preserve keypair if present |
| `programs/booking_escrow/` | `programs/tourchain_escrow/` | Real SOL transfer in `create_escrow`/`release_milestone`; `BookingStatus` enum; dual-sig milestone release; add `cancel_booking`, `complete_booking`, `open_dispute`, `resolve_dispute` |

### Migrate (value salvageable)

| File | Destination |
|---|---|
| `backend/src/services/qrService.js` | `apps/web/src/lib/qr.ts` — HMAC logic is correct; convert to TypeScript |

### Keep and rewire

| File | Change |
|---|---|
| `apps/web/src/components/SolanaProvider.tsx` | Read cluster from `NEXT_PUBLIC_SOLANA_CLUSTER`; add Solflare + Backpack adapters |
| `apps/web/src/components/Map.tsx` | Token from `NEXT_PUBLIC_MAPBOX_TOKEN` |
| `apps/web/src/app/layout.tsx`, `page.tsx` | Keep; replace hardcoded stats with Supabase queries |
| Tailwind + shadcn + Framer Motion | Keep as-is |
| TypeScript strict mode | Keep |

---

## 5. Target Architecture After Cleanup

```
tourchain/
├── apps/web/                         # Next.js 15, App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/             # landing, explore, guide/[id], route/[id]
│   │   │   ├── (auth)/               # login, signup
│   │   │   ├── (app)/                # dashboard, book, trek/[bookingId], profile, leaderboard
│   │   │   ├── (admin)/              # admin/guides, admin/disputes, admin/analytics
│   │   │   └── api/
│   │   │       ├── checkin/          # GPS + QR verification
│   │   │       ├── booking/prepare/  # escrow helpers
│   │   │       ├── proof/mint/       # platform-signed cNFT mint
│   │   │       └── admin/            # verify-guide, resolve-dispute
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── supabase/{client,server,middleware}.ts
│   │   │   ├── solana/{anchor,reputation,escrow,proof}.ts
│   │   │   ├── solana/idl/*.json     # copied from target/idl at build
│   │   │   ├── auth/{email,wallet}.ts
│   │   │   ├── qr.ts                 # migrated from backend
│   │   │   ├── env.ts                # zod-validated env
│   │   │   └── validation/*.ts
│   │   └── middleware.ts
│   ├── .env.example
│   └── package.json
├── programs/
│   ├── tourchain_reputation/
│   ├── tourchain_escrow/
│   └── tourchain_proof/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_leaderboard.sql
│   │   └── 0004_seed.sql
│   └── functions/
│       └── reputation-sync/          # listens to reviews, calls update_reputation
├── scripts/
│   ├── init-merkle-tree.ts
│   ├── seed-devnet.ts
│   └── copy-idl.ts
├── Anchor.toml                       # forward-slash wallet path
├── rust-toolchain.toml               # pinned 1.79.0
├── Cargo.toml                        # workspace with 3 programs
└── package.json                      # workspaces: ["apps/*"]
```

### Ownership rules

- **Next.js** owns UI, auth middleware, API routes for platform-signed ops, wallet-adapter integration.
- **Supabase** owns relational data, auth, storage, RLS, realtime, server-side aggregation.
- **Solana** owns exactly three things: guide reputation PDA, booking escrow PDA with SOL vault, completion proof cNFTs. Nothing else.
- **Arweave** owns permanent NFT metadata in V1. MVP uses Supabase Storage; swap is a URI change.

---

## 6. Claude Code Dev-Prompts

Paste one at a time, in order. Each assumes the previous completed successfully.

### Prompt 1 — Remove Express + MongoDB backend

```
Delete the entire `backend/` directory EXCEPT `backend/src/services/qrService.js`. First migrate that file to `apps/web/src/lib/qr.ts` (convert to TypeScript, replace `require` with `import`, export named `generateDailyToken` and `verifyToken` functions). Then:

1. Remove `backend` from root package.json workspaces array.
2. Delete any root npm scripts referencing the backend: dev:backend, start:backend, build:backend.
3. Search the entire repo for `localhost:3001` and replace with relative paths, or delete the caller.
4. Search for imports of mongoose, MongoDB models (Tourist, Place, Visit), or anything from `backend/`. Delete those call sites. Wiring to Supabase comes in Prompt 2.
5. Remove mongoose-related entries from any package.json.
6. Update root README.md to remove Express/MongoDB/port-3001 references.

Acceptance:
- `rg -i "mongoose|mongodb|express" apps/web/src programs/` returns zero matches.
- `node -e "const fs=require('fs'); process.exit(fs.existsSync('backend') ? 1 : 0)"` exits 0.
- `apps/web/src/lib/qr.ts` exists and compiles.

Do not touch programs/ or the `apps/web` data-fetching layer in this prompt.
```

### Prompt 2 — Wire Supabase as source of truth

```
Create the Supabase project layer at repo root.

1. Create `supabase/migrations/0001_init_schema.sql` with CREATE TABLE statements for every table in tourchain-strategy.md section F: users, guides, places, routes, route_checkpoints, quests, services, bookings, check_ins, reviews, disputes, completion_proofs. Use exact column names, types, constraints, and enums from strategy. Foreign keys with ON DELETE CASCADE where appropriate.

2. Create `supabase/migrations/0002_rls_policies.sql` with RLS enabled on every table. Create helper function `is_admin(uid uuid) returns boolean` that checks `users.role = 'admin'`. Policies per strategy: users (public SELECT, self UPDATE), guides (public SELECT, self or admin write), places/routes/quests (public SELECT, admin-only write), services (public SELECT, guide owner write), bookings (participants or admin SELECT, tourist INSERT, participants UPDATE), check_ins (booking participants), reviews (public SELECT, reviewer INSERT only if booking completed, UNIQUE (booking_id, reviewer_id)), disputes (filer or admin), completion_proofs (public SELECT, service-role INSERT).

3. Create `supabase/migrations/0003_leaderboard.sql` with materialized view per strategy plus `refresh_leaderboard()` function.

4. Create `supabase/migrations/0004_seed.sql` with: 5 Nepal routes (Everest Base Camp, Annapurna Circuit, Langtang Valley, Manaslu Circuit, Poon Hill), 15 places with real lat/lng, 3 verified guides with bios, 10 quests including a "Laughing Island" endpoint quest.

5. Install in apps/web: `@supabase/supabase-js`, `@supabase/ssr`, `zod`.

6. Create `apps/web/src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` using @supabase/ssr.

7. Append to `.env.example`:
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=

Acceptance:
- `supabase db reset` applies all 4 migrations with zero errors.
- SQL verification confirms counts: routes=5, places=15, guides=3.
- Supabase client factories exist and type-check.

Do not build UI in this prompt.
```

### Prompt 3 — Dual auth: Supabase + wallet signature

```
Implement Supabase Auth for session identity plus Solana wallet signature for on-chain authorization.

1. Install in apps/web: `@solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-base @coral-xyz/anchor bs58 tweetnacl`.

2. Create `apps/web/src/middleware.ts` that uses @supabase/ssr to refresh the session on every request and protects:
   - /dashboard, /book, /trek, /profile → authenticated
   - /admin/* → authenticated AND users.role = 'admin'
   - Redirect unauthenticated to /login, non-admin to /dashboard.

3. Create `apps/web/src/lib/auth/email.ts` with signUp, signIn, signOut wrappers.

4. Create `apps/web/src/lib/auth/wallet.ts`:
   - buildSignMessage(nonce, walletAddress) → "TourChain: link wallet {addr} at {nonce}"
   - verifyWalletSignature(message, signatureBase58, walletAddress) using tweetnacl.sign.detached.verify
   - linkWallet(userId, walletAddress, signature, nonce) → verify + update users.wallet_address

5. Create `/api/auth/link-wallet/route.ts`: reads current user from session, accepts { walletAddress, signature, nonce }, validates nonce freshness, verifies signature, updates users.wallet_address, returns 200 or 400.

6. Refactor `apps/web/src/components/SolanaProvider.tsx` to read NEXT_PUBLIC_SOLANA_CLUSTER and NEXT_PUBLIC_SOLANA_RPC. Add Phantom, Solflare, Backpack adapters.

7. Create `apps/web/src/components/AuthProvider.tsx` exposing { user, session, wallet, isGuide, isAdmin, signIn, signOut, connectWallet, linkWallet }.

8. Append to .env.example:
   NEXT_PUBLIC_SOLANA_CLUSTER=devnet
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

Guard against:
- Nonce replay: nonces single-use, expire within 5 minutes.
- Double-linking: reject if wallet already linked to another account (UNIQUE constraint on users.wallet_address).
- Do NOT lowercase base58 addresses.

Acceptance:
- Middleware redirects unauthenticated users on protected routes.
- Wallet link endpoint verifies a real Phantom signature and persists wallet_address.
- Invalid signature returns 400, not 500.
```

### Prompt 4 — Prune Anchor workspace to three programs

```
1. Delete these program directories:
   - programs/loyalty_token
   - programs/dao_governance
   - programs/route_registry
   - programs/carbon_credits
   - programs/pricing_oracle
   - programs/sos_insurance
   - programs/experience_nft

2. Rename (preserve existing keypairs in target/deploy/ if present so program IDs survive):
   - programs/tourism_registry → programs/tourchain_reputation
   - programs/booking_escrow → programs/tourchain_escrow
   Update each program's Cargo.toml [package].name, [lib].name, and declare_id! macro.

3. Create programs/tourchain_proof as a fresh empty Anchor program (implementation lands in Prompt 6).

4. Update root Anchor.toml:
   - Remove [programs.*] entries for all deleted programs.
   - Add entries for the three survivors.
   - Fix wallet path: change `~\.config\solana\id.json` to `~/.config/solana/id.json`.
   - Ensure `[features] skip-lint = false`.

5. Update root Cargo.toml [workspace].members to list only the three programs.

6. Update rust-toolchain.toml to channel = "1.79.0".

7. Delete the `sdk/` directory entirely. Any `apps/web` code importing from it: delete those call sites (they will be rebuilt in Prompt 7). Do NOT leave commented-out imports.

8. Remove any root package.json scripts referencing sdk/ or deleted programs.

Acceptance:
- `node -e "const fs=require('fs'); const dirs=fs.readdirSync('programs',{withFileTypes:true}).filter(d=>d.isDirectory()).length; process.exit(dirs===3?0:1)"` exits 0.
- `anchor build` succeeds.
- `cargo metadata --format-version 1` lists three workspace crates.
- `sdk/` does not exist.

Do NOT implement business logic in this prompt. Structure only.
```

### Prompt 5 — Implement tourchain_reputation and tourchain_escrow

```
Implement both programs per tourchain-strategy.md section E.

=== programs/tourchain_reputation/src/lib.rs ===

#[account]
pub struct GuideReputation {
    pub authority: Pubkey, pub admin: Pubkey,
    pub name: [u8; 64],
    pub total_reviews: u32, pub total_score: u64,
    pub completed_treks: u32,
    pub active_since: i64,
    pub is_verified: bool, pub is_suspended: bool,
    pub last_updated: i64, pub bump: u8,
}
// seeds: [b"guide", authority.key().as_ref()]
// size: 8+32+32+64+4+8+4+8+1+1+8+1 = 171

Instructions (all admin-signed):
- initialize_guide(name: [u8; 64]): init PDA, active_since=Clock, is_verified=true
- update_reputation(score: u8): require 1<=score<=5 and !is_suspended; total_reviews++, total_score += score*100, completed_treks++, last_updated=Clock (all checked_add)
- suspend_guide(): is_suspended = true
- reinstate_guide(): is_suspended = false

Errors: UnauthorizedAdmin, GuideSuspended, InvalidScore, Overflow.
Events: GuideRegistered, ReputationUpdated, GuideSuspended, GuideReinstated.

=== programs/tourchain_escrow/src/lib.rs ===

#[account]
pub struct BookingEscrow {
    pub tourist: Pubkey, pub guide: Pubkey, pub admin: Pubkey,
    pub amount: u64, pub released: u64,
    pub milestones: u8, pub milestones_completed: u8,
    pub status: BookingStatus,
    pub created_at: i64, pub dispute_deadline: i64, pub bump: u8,
}
pub enum BookingStatus { Funded, Active, Completed, Disputed, Refunded, Cancelled }
// seeds: [b"escrow", tourist.key().as_ref(), guide.key().as_ref(), &created_at.to_le_bytes()]
// Vault PDA: [b"vault", escrow.key().as_ref()] — System-owned, holds native SOL

Instructions:
- create_escrow(amount, milestones, created_at) [tourist signer]: require 1 <= milestones <= 10; system_program::transfer amount lamports from tourist to vault PDA; status=Funded
- activate() [guide signer]: require status==Funded; status=Active
- release_milestone() [tourist AND guide signers]: require status==Active and milestones_completed < milestones; per_ms = amount/milestones; move per_ms lamports from vault to guide via direct lamport accounting (**vault.lamports.borrow_mut() -= per_ms; **guide.lamports.borrow_mut() += per_ms); released += per_ms; milestones_completed += 1
- complete_booking() [tourist AND guide]: move (amount - released) from vault to guide; status=Completed
- cancel_booking() [tourist]: require status==Funded; refund full amount; status=Cancelled
- open_dispute() [tourist OR guide]: status=Disputed
- resolve_dispute(tourist_refund_bps: u16) [admin]: require bps <= 10000; remaining = amount - released; to_tourist = remaining * bps / 10000; to_guide = remaining - to_tourist; move accordingly; status=Refunded

Errors: InvalidStatus, InvalidMilestones, Overflow, UnauthorizedAdmin, DisputeBpsOutOfRange, InsufficientVault.
Events: EscrowCreated, EscrowActivated, MilestoneReleased, BookingCompleted, BookingCancelled, DisputeOpened, DisputeResolved.

Write tests in programs/*/tests/ covering happy path + one failure per instruction.
Run `anchor build && anchor keys sync` to populate real declare_id!() values.

Guard against:
- Hardcoded admin pubkey in source — require admin on account struct, checked in constraints.
- Integer overflow — always checked_add/checked_mul.
- Vault drain on release — compute per_ms before modifying released.
- Double-completion — status guard on every mutating instruction.

Acceptance:
- `anchor build` succeeds.
- `anchor test` passes all tests.
- target/idl/tourchain_reputation.json and tourchain_escrow.json exist.
```

### Prompt 6 — Implement tourchain_proof with Bubblegum

```
Implement programs/tourchain_proof/src/lib.rs as a thin Bubblegum wrapper for completion proof cNFTs.

Add to programs/tourchain_proof/Cargo.toml:
  anchor-lang = "0.30"
  anchor-spl = "0.30"
  mpl-bubblegum = { version = "1.3", features = ["cpi"] }
  spl-account-compression = { version = "0.4", features = ["cpi"] }

#[account]
pub struct ProofAuthority {
    pub admin: Pubkey, pub merkle_tree: Pubkey,
    pub total_minted: u64, pub bump: u8,
}
// seeds: [b"proof_authority"]

Instructions:
- initialize_proof_authority(merkle_tree: Pubkey) [admin]: one-time setup after off-chain tree creation
- mint_completion_proof(name: String, symbol: String, uri: String) [admin only]: validate name.len()<=32, symbol.len()<=10, uri.len()<=200; CPI mpl_bubblegum::cpi::mint_v1 with MetadataArgs { name, symbol, uri, seller_fee_basis_points: 0, primary_sale_happened: true, is_mutable: false, ... }; total_minted += 1

Errors: UnauthorizedAdmin, NameTooLong, SymbolTooLong, UriTooLong.

Also create `scripts/init-merkle-tree.ts`:
- Use @metaplex-foundation/mpl-bubblegum Umi plugin
- Read keypair from ANCHOR_WALLET env (fail loudly if missing)
- Read RPC from SOLANA_RPC env (fallback to NEXT_PUBLIC_SOLANA_RPC, then devnet)
- Check balance >= 2 SOL before proceeding
- createTree({ maxDepth: 14, maxBufferSize: 64, canopyDepth: 0 }) supporting ~16K mints
- Print tree address; append NEXT_PUBLIC_MERKLE_TREE={addr} to apps/web/.env.local

Guard against:
- Non-admin minting — constraint on ProofAuthority.admin.
- String overflows — enforce max lengths before CPI.
- Tree not initialized — call fails gracefully.

Acceptance:
- `anchor build` succeeds across all three programs.
- `anchor test` passes non-admin rejection test.
- `pnpm tsx scripts/init-merkle-tree.ts` creates a tree on devnet and prints address.
```

### Prompt 7 — Wire `apps/web` to real data, kill all mocks

```
Rewire apps/web from stubs/mocks to real Supabase + real Solana.

1. Downgrade Next.js only if required by project/toolchain compatibility: apps/web/package.json "next": "^15.2.0", "react": "^18.3.0", "react-dom": "^18.3.0". Install and resolve any Next 16-only syntax if downgrade is applied.

2. Create apps/web/src/lib/solana/:
   - anchor.ts: getProvider(wallet), getProgram<T>(idl, programId, provider)
   - idl/ : copy target/idl/*.json files here; add cross-platform `scripts/copy-idl.ts` run after anchor build
   - reputation.ts: getGuidePda(wallet), fetchGuideReputation(wallet) (null if uninitialized)
   - escrow.ts: createEscrow, releaseMilestone, completeBooking, cancelBooking (return tx signatures)
   - proof.ts: client helper that POSTs to /api/proof/mint

3. Kill all mock data. Grep for "1,248", "4,520", "TODO", hardcoded guide names, "Coming soon". For each:
   - Dashboard stats → Supabase aggregates
   - Home/landing counters → real counts or remove
   - Guide profile → join guides + users + fetch reputation PDA
   - Explore → SELECT * FROM routes WHERE is_active
   - Booking → fetch service by ID, join guide
   - Profile → fetch user's completions, check-ins, proofs

4. Build apps/web/src/app/(app)/trek/[bookingId]/page.tsx:
   - Fetch booking + route + checkpoints
   - Progress bar from check_ins count
   - Enable check-in button only when browser geolocation within 500m of next unchecked-in checkpoint (client-side gate; server revalidates)
   - POST /api/checkin with { booking_id, place_id, lat, lng }

5. Create API routes:
   - /api/checkin: validates GPS (haversine server-side), inserts check_ins, verified=true
   - /api/checkin/qr-verify: uses lib/qr.ts for HMAC
   - /api/booking/prepare: returns escrow PDA and expected instruction for client to sign
   - /api/proof/mint: admin-only; loads platform keypair from SOLANA_PLATFORM_KEYPAIR base58 env; calls mint_completion_proof; inserts completion_proofs row

6. Fix apps/web/src/components/Map.tsx — token ONLY from NEXT_PUBLIC_MAPBOX_TOKEN.

7. Run `pnpm dlx ts-prune` and delete unreferenced mock files.

Guard against:
- Wallet not connected — always check publicKey before on-chain calls.
- PDA seed byte-order mismatch — client seeds MUST match program byte-for-byte, especially created_at.to_le_bytes().
- GPS spoofing — server must revalidate distance, never trust client claim.
- Missing IDL at runtime — import IDLs statically.

Acceptance:
- Test wallet can browse → book → sign create_escrow → record in Supabase AND on-chain.
- `rg "1,248|4,520|4520 SOL" apps/web/src/` returns zero matches.
- `rg "pk\\.ey" apps/web/src/` returns zero hardcoded Mapbox tokens (only env references).
- `pnpm --filter apps/web build` succeeds.
```

### Prompt 8 — Env + config hygiene

```
Fix all environment, config, and secret management.

1. Create apps/web/.env.example:
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   # Solana
   NEXT_PUBLIC_SOLANA_CLUSTER=devnet
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
   NEXT_PUBLIC_REPUTATION_PROGRAM_ID=
   NEXT_PUBLIC_ESCROW_PROGRAM_ID=
   NEXT_PUBLIC_PROOF_PROGRAM_ID=
   NEXT_PUBLIC_MERKLE_TREE=
   SOLANA_PLATFORM_KEYPAIR=
   # Mapbox
   NEXT_PUBLIC_MAPBOX_TOKEN=
   NEXT_PUBLIC_APP_URL=http://localhost:3000

2. Create apps/web/src/lib/env.ts using zod:
   - Separate PublicEnv (NEXT_PUBLIC_*) and ServerEnv schemas
   - Throw descriptive error at startup if required vars missing
   - Export typed `env` object

3. Replace every process.env.* in apps/web/src/ with env.* from lib/env.ts.

4. .gitignore additions: .env, .env.local, .env.*.local, *.keypair.json, target/, .next/, dist/.

5. Audit: `rg -i "sk_|eyJ[A-Za-z0-9_-]{20,}"` — if secrets found, rotate and scrub from git history.

6. Solana network config:
   - Anchor.toml [provider] cluster = "devnet"
   - Scripts read SOLANA_CLUSTER env, default devnet
   - Frontend reads NEXT_PUBLIC_SOLANA_CLUSTER

Guard against:
- Silent fallback to hardcoded defaults — missing required env must crash at startup.
- Leaked service-role key — verify SUPABASE_SERVICE_ROLE_KEY is never imported in a client component (bundler will flag).

Acceptance:
- Starting app with empty .env.local prints clean zod error listing missing vars.
- `rg "process\\.env" apps/web/src/` returns zero matches (all via env.ts).
- No keypair files tracked in git.
```

### Prompt 9 — Error handling + validation

```
Add production-grade error handling and validation.

1. Create apps/web/src/lib/validation/schemas.ts with zod schemas:
   - CreateBookingInput: { serviceId: uuid, startDate: ISO date, milestones: int 1-10 }
   - CheckinInput: { bookingId: uuid, placeId: uuid, lat: -90..90, lng: -180..180 }
   - ReviewInput: { bookingId: uuid, rating: 1-5, comment: max 2000 chars }
   - WalletLinkInput: { walletAddress: base58 32-44, signature: base58, nonce: string }
   - DisputeInput: { bookingId: uuid, category: enum, description: 10-2000 chars, evidenceUrls: array max 5 }

2. In every route handler under apps/web/src/app/api/:
   - Parse body with schema.safeParse(await req.json())
   - Return 400 with zod error details on failure
   - try/catch returning 500 with generic message, logging server-side
   - Shared `handle(req, schema, fn)` helper enforces this pattern

3. Create apps/web/src/lib/errors.ts:
   - AppError(status, code, message)
   - NotFoundError, UnauthorizedError, ValidationError, ConflictError
   - Global error boundary at apps/web/src/app/error.tsx

4. Rate limiting on mutating routes (use Supabase-backed counter or @upstash/ratelimit):
   - /api/auth/link-wallet: 5/min per IP
   - /api/checkin: 10/min per user
   - /api/booking/prepare: 20/min per user
   - /api/proof/mint: admin-only, 60/min per user

5. Client side: wrap Supabase queries and Solana TX calls; distinguish "wallet rejected" from "on-chain failure" in toasts.

Guard against:
- Leaking stack traces — production responses never contain error.stack.
- Silent failures — every caught exception logged.
- Unchecked bounds — zod .max() on every string and array.

Acceptance:
- Malformed body to /api/checkin returns 400 with field-level messages.
- Server error returns 500 with generic body, full exception server-logged.
- Rate limit exceeded returns 429.
```

### Prompt 10 — Tests, dead code sweep, CI

```
Lock down the working system.

1. Anchor tests:
   - programs/tourchain_reputation/tests/ — all 4 instructions, happy + one failure each
   - programs/tourchain_escrow/tests/ — full lifecycle create→activate→release×N→complete + cancel + dispute paths
   - programs/tourchain_proof/tests/ — init authority + reject non-admin mint

2. Integration script scripts/e2e-devnet.ts: create guide → initialize reputation → tourist creates escrow → guide activates → release milestone → complete → tourist reviews → admin update_reputation → mint proof → assert all on-chain state matches.

3. Frontend tests (Vitest + RTL):
   - apps/web/tests/booking-flow.test.tsx: renders form, submits with wallet mock
   - apps/web/tests/checkin.test.tsx: GPS gating logic
   - apps/web/tests/auth.test.tsx: middleware redirects

4. Dead code sweep:
   - `pnpm dlx ts-prune` — delete unused exports (except route/page/layout)
   - `cargo +nightly udeps` — remove unused Rust deps
   - `rg "TODO|FIXME|XXX"` — resolve all in hot paths (booking, check-in, escrow, proof)
   - Delete commented-out blocks > 3 lines

5. Update root README: final architecture, how to run locally (supabase start, anchor build/deploy, pnpm dev), how to seed devnet.

6. Add .github/workflows/ci.yml: on PR run anchor build, anchor test, pnpm --filter apps/web typecheck, pnpm --filter apps/web build, vitest run.

Guard against:
- Flaky tests — deterministic seeds, explicit waits never relying on timing.
- Tests importing production env — use test-specific Supabase local instance.

Acceptance:
- `pnpm test` and `anchor test` both pass.
- `pnpm dlx ts-prune` output is empty or only lists intentional exports.
- `rg "TODO" apps/web/src/app/api/` returns zero hits.
- CI green on fresh push.
```

---

## 7. Safe Execution Order

Default execution is strict in this order. Parallelization is allowed only where explicitly marked and only after dependency checks pass.

| # | Prompt | Why this position |
|---|---|---|
| 1 | Remove backend | Removes the largest source of conflicting imports first |
| 2 | Supabase schema | Establishes new source of truth before anything reads from it |
| 3 | Auth | Required before any protected route or authenticated API is built |
| 4 | Prune Anchor programs | Structural cleanup; program IDs don't matter yet |
| 5 | Implement reputation + escrow | Core on-chain logic; IDLs unblock `apps/web` |
| 6 | Implement proof | Depends on Bubblegum tree init step |
| 7 | Wire `apps/web` | Needs working IDLs from 5–6 and Supabase from 2 |
| 8 | Env + config hygiene | Best after all env variables are known |
| 9 | Error handling + validation | Apply uniformly to all routes that now exist |
| 10 | Tests + dead code sweep | Last — locks down working system |

### Never touch until dependencies stable

- Do not run Prompt 7 before Prompts 5+6. Frontend compiles but all on-chain calls fail silently.
- Do not delete `sdk/` before confirming no `apps/web` code imports from it — Prompt 4 handles this; verify before deleting.
- Do not run migrations on shared Supabase before seeding locally with `supabase db reset`.
- Do not deploy to mainnet until all tests pass on devnet and one full e2e run succeeds.

### Parallelizable (if team > 1)

- Prompts 4–6 (programs) parallel with Prompts 1–3 (backend + Supabase).
- Prompt 8 (env) any time after Prompt 3.
- Prompt 10 (tests) can start incrementally during Prompts 5–7.

---

## 8. Refactor Rules (non-negotiable)

1. **Preserve buildability at every commit.** Non-building commits never land on main.
2. **Delete dead code; never comment it out.** Git history is the rollback plan.
3. **No duplicate sources of truth.** Data lives in one place: Supabase for relational, Solana for trust-critical, nothing else.
4. **No hardcoded secrets.** Mapbox tokens, wallet paths, RPC URLs, treasury addresses, program IDs all come from env or git-ignored files.
5. **No placeholder constants in production paths.** `Pubkey::default()`, `"1111...1111"`, `0x0` never acceptable as runtime defaults. Required values crash on startup if missing.
6. **One backend, not two.** Next.js API routes own all server logic. No parallel Express. No Edge Function duplicating a Next.js route.
7. **No mock data where real data can be wired.** Static lorem only in marketing copy.
8. **No abstraction without reason.** Wrappers justified only if they reduce complexity or centralize policy. Trivial pass-throughs deleted.
9. **Env access via `lib/env.ts`.** Direct `process.env.*` banned outside that file.
10. **Every API route validates with zod, catches errors, returns structured responses.**
11. **Anchor instructions always checked_add/checked_sub.** No raw arithmetic on on-chain numerics.
12. **PDA seeds byte-exact match between client and program.** Seed mismatches = #1 source of silent failures.
13. **Never regress TypeScript strict or Rust overflow-checks.**
14. **Never log sensitive data.** Keypairs, service role keys, emails in production logs = never.
15. **Anchor version must be uniform across all programs.** Do not mix `anchor-lang`/`anchor-spl` versions across workspace crates.

---

## 9. Top 10 Risks to Watch

1. **Program ID drift.** Renaming `tourism_registry` → `tourchain_reputation` without preserving the keypair invalidates deployed program. If `target/deploy/tourism_registry-keypair.json` exists, copy it to `tourchain_reputation-keypair.json` before building, or accept a redeploy.
2. **PDA seed mismatches.** Escrow seeds include `created_at.to_le_bytes()`. If client sends seconds and program expects milliseconds (or vice versa), every TX fails with "constraint seeds". Decide once, document, assert in tests.
3. **Bubblegum tree funding.** Tree at depth 14 requires ~2 SOL on devnet for rent. If the init script runs on a 0-SOL wallet, it fails in opaque ways. Check balance at script start.
4. **Supabase RLS locking out service role.** Service role bypasses RLS, but policies referencing `auth.uid()` in triggers can fail when invoked from service-role context. Test every policy with both anon and service-role keys.
5. **Next.js 16 → 15 syntax regressions.** Some Next 16 patterns (new caching, async params) don't compile in Next 15. Expect to rewrite several `page.tsx` files.
6. **Anchor version mismatch.** Mixing `anchor-lang = "0.29"` and `"0.30"` across programs explodes workspace compilation. Pin one version.
7. **Wallet address collision.** Two users linking the same wallet must be rejected. Without `UNIQUE` on `users.wallet_address`, a race lets two accounts share a wallet. Add constraint + server-side pre-check.
8. **IDL staleness.** If `target/idl/*.json` is checked in, engineers forget to re-copy after `anchor build` and `apps/web` calls with outdated structs. Regenerate on every build via postbuild script, or don't check IDLs in and copy at build time.
9. **Dev vs prod keypair leak.** `SOLANA_PLATFORM_KEYPAIR` must be separate env vars in separate Vercel environments. Confirm before enabling mainnet.
10. **Materialized view staleness.** `leaderboard` doesn't auto-refresh. Forgetting `REFRESH MATERIALIZED VIEW leaderboard` on review insert freezes rankings. Wire into a Supabase trigger or scheduled edge function.

---

## Sanity check

After full execution: three programs instead of nine, one backend instead of two, one schema instead of two data models, one wallet sign-in flow instead of custom auth, env-driven config instead of hardcoded constants, zero commented-out legacy code. File count drops. Surface area shrinks. Everything remaining does real work. **This is a simplification, not a rewrite.**
