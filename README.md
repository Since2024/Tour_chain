# TourChain

**A trust-first adventure tourism platform for Nepal — verified guides, escrow-protected bookings, and on-chain proof of every journey.**

Built for the [Colosseum Hackathon](https://www.colosseum.org/) · Powered by Solana

---

## Table of Contents

- [Overview](#overview)
- [What It Solves](#what-it-solves)
- [Architecture](#architecture)
- [Solana Programs](#solana-programs)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Program Addresses](#program-addresses)
- [Core Flows](#core-flows)
- [Data Model](#data-model)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TourChain turns Nepal's $2.4B trekking economy — which runs on paper permits, cash payments, and word-of-mouth trust — into a structured, verifiable, and scam-resistant system.

It is **not** a blockchain app that happens to involve tourism. It is a tourism product that uses Solana where it genuinely solves trust, verification, and proof problems that web2 cannot.

Think Komoot meets Duolingo meets Airbnb Experiences — with Solana as the trust backbone and Nepal as the proving ground.

---

## What It Solves

| Problem | Current Reality | TourChain Solution |
|---|---|---|
| Guide trust | TripAdvisor reviews — platform-owned, gameable | On-chain reputation PDAs that guides own forever |
| Booking safety | Pay cash upfront, hope for the best | Milestone-based escrow, funds release as trek progresses |
| Proof of completion | Instagram selfie | GPS-verified, guide-signed cNFT minted to your wallet |
| Route discovery | Scattered blog posts | Structured quest system with story-driven checkpoints |
| Commission extraction | Viator/OTAs take 20–25% | Platform fee of 3–5%, rest goes directly to the guide |
| Scam prevention | None | Admin-verified operators, transparent review history |

Nepal's trekking economy loses 30–40% to corruption and administrative friction. Guides build decade-long reputations on platforms they don't own. Porters get shorted with no recourse. TourChain fixes this by making trust data portable, payments transparent, and achievements verifiable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│   Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Quest Map│ │ Booking  │ │ Guide    │ │  Admin   │        │
│  │ + Routes │ │  Flow    │ │ Profile  │ │  Panel   │        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       └────────────┴────────────┴────────────┘               │
│              Wallet Adapter (Phantom / Solflare)              │
└───────────────────────────┬─────────────────────────────────┘
                            │
           ┌────────────────┼──────────────────┐
           │                │                  │
           ▼                ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
│    Supabase     │ │  Supabase    │ │   Solana       │
│    Postgres     │ │  Edge Fns    │ │   Devnet/Main  │
│                 │ │              │ │                │
│ • Users         │ │ • TX relay   │ │ • Reputation   │
│ • Quests        │ │ • Webhook    │ │   PDA          │
│ • Bookings      │ │   handlers   │ │ • Escrow PDA   │
│ • Reviews       │ │ • Solana     │ │ • Completion   │
│ • Check-ins     │ │   verify     │ │   cNFT mint    │
│ • Disputes      │ └──────┬───────┘ └───────┬────────┘
│ • Places        │        │                 │
│ • Routes        │        └────────┐        │
│                 │                 ▼        ▼
│  + RLS          │         ┌──────────────────┐
│  + Realtime     │         │     Arweave      │
│  + Storage      │         │  (NFT metadata)  │
└─────────────────┘         └──────────────────┘
```

### On-chain vs Off-chain

| Data | Location | Reason |
|---|---|---|
| Guide reputation score | On-chain (PDA) | Portable, tamper-proof, owned by guide |
| Booking escrow | On-chain (PDA) | Trustless payment — neither party can cheat |
| Completion proof | On-chain (cNFT) | Permanent, verifiable, collectible |
| Quest definitions | Off-chain (Supabase) | Frequently updated, no trust requirement |
| User profiles | Off-chain (Supabase) | Personal data, GDPR, frequent updates |
| Reviews | Off-chain (Supabase) + on-chain summary | Full text off-chain, aggregated score on-chain |
| Bookings / check-ins | Off-chain (Supabase) | Fast writes, metadata, contact info |

**The principle:** Put data on-chain only when it needs to be trustless, portable, or permanently verifiable. Everything else stays in Postgres — fast, cheap, queryable.

---

## Solana Programs

Three programs. Not nine. Each handles only what requires trustlessness.

### `tourchain_reputation` — Guide Identity & Reputation

The most valuable thing a guide owns is their reputation. This program stores it in a PDA they control — portable across any platform that reads Solana state.

| Instruction | Signer | Description |
|---|---|---|
| `initialize_guide` | Admin | Create a reputation PDA for a verified guide |
| `update_reputation` | Admin | Add a review score, increment completion count |
| `suspend_guide` | Admin | Set `is_suspended = true` |
| `reinstate_guide` | Admin | Set `is_suspended = false` |

**PDA seeds:** `["guide", guide_wallet]`

---

### `tourchain_escrow` — Milestone-Based Booking Payments

Funds leave the tourist's wallet and only reach the guide as the trek progresses. Neither party can cheat. No intermediary holds the money.

| Instruction | Signer | Description |
|---|---|---|
| `create_escrow` | Tourist | Initialize escrow PDA, transfer SOL to vault |
| `activate` | Guide | Guide accepts the booking |
| `release_milestone` | Guide + Tourist | Release 1/N of funds; both must sign (or admin override) |
| `complete_booking` | Guide + Tourist | Release remaining funds, mark completed |
| `open_dispute` | Tourist or Guide | Freeze releases, flag for admin review |
| `resolve_dispute` | Admin | Split remaining funds per admin decision |
| `cancel_booking` | Tourist | Full refund if guide hasn't accepted yet |

**BookingStatus FSM:** `Funded → Active → Completed | Disputed | Refunded | Cancelled`

**PDA seeds:** `["escrow", tourist, guide, created_at]`

---

### `tourchain_proof` — Compressed NFT Completion Proofs

Every completed trek is minted as a Metaplex Bubblegum cNFT — permanent, verifiable, collectible. Cost: ~$0.00001 per mint.

| Instruction | Signer | Description |
|---|---|---|
| `initialize_tree` | Admin | Create Merkle tree for cNFT minting |
| `mint_completion_proof` | Admin | CPI to Bubblegum — mint cNFT to tourist wallet |

Only the platform admin can mint, and only after verifying completion via Supabase check-in records and guide co-signature. No fake proofs.

**Example cNFT metadata:**
```json
{
  "name": "Annapurna Circuit Completion",
  "symbol": "TREK",
  "attributes": [
    { "trait_type": "Route", "value": "Annapurna Circuit" },
    { "trait_type": "Duration", "value": "14 days" },
    { "trait_type": "Guide", "value": "Ram Gurung" },
    { "trait_type": "Completed", "value": "2026-04-15" },
    { "trait_type": "Checkpoints", "value": "12/12" }
  ]
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust + Anchor framework |
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Database | Supabase (Postgres) with Row-Level Security |
| Auth | Supabase Auth (email/social) + Solana wallet signature verification |
| Maps | Mapbox GL JS |
| NFTs | Metaplex Bubblegum (compressed NFTs) |
| File Storage | Supabase Storage (images, docs) + Arweave (NFT metadata) |
| Analytics | PostHog |
| Deployment | Vercel (frontend) + Supabase (hosted) + Solana Devnet → Mainnet |
| Wallet | Phantom / Solflare (via Solana Wallet Adapter) |

---

## Repository Structure

```
Tour_chain/
├── programs/                      # Anchor smart contracts (Rust)
│   ├── tourchain_reputation/      # Guide identity + on-chain reputation PDA
│   ├── tourchain_escrow/          # Milestone-based SOL escrow
│   └── tourchain_proof/           # Bubblegum cNFT completion proofs
│
├── apps/
│   └── web/                       # Next.js 15 frontend
│       └── src/
│           ├── app/               # App Router pages
│           └── components/        # Wallet provider, Map, UI components
│
├── supabase/
│   └── migrations/                # Postgres schema + RLS policies + seed data
│
├── Anchor.toml                    # Anchor workspace config
├── Cargo.toml                     # Rust workspace
└── vercel.json                    # Deployment config
```

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) `1.89+`
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) `1.18+`
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) `0.32+`
- [Node.js](https://nodejs.org/) `18+`
- [Yarn](https://yarnpkg.com/) `1.22+`
- A [Supabase](https://supabase.com/) project
- A [Phantom](https://phantom.app/) wallet funded with devnet SOL

### 1. Clone and Install

```bash
git clone https://github.com/Since2024/Tour_chain.git
cd Tour_chain
yarn install
```

### 2. Configure Environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in the required values — see [Environment Variables](#environment-variables).

### 3. Deploy Supabase Schema

```bash
supabase db push
```

This runs all migrations in `supabase/migrations/` — tables, RLS policies, and seed data (5 routes, 15 checkpoint places, 3 verified guides, 10 quests).

### 4. Build Anchor Programs

```bash
anchor build
```

IDL artifacts will be generated at `target/idl/`.

### 5. Deploy to Devnet

```bash
solana config set --url devnet
anchor deploy
```

Update `Anchor.toml` with the new program IDs, then rebuild.

### 6. Start the Frontend

```bash
cd apps/web
yarn dev
# App running at http://localhost:3000
```

---

## Program Addresses

| Program | Network | Address |
|---|---|---|
| `tourchain_reputation` | Devnet | Pending deployment |
| `tourchain_escrow` | Devnet | Pending deployment |
| `tourchain_proof` | Devnet | Pending deployment |

---

## Core Flows

### Tourist Journey

```
Browse quests/routes → View verified guide profiles + on-chain reputation scores
→ Book guide (payment held in escrow)
→ Day 1: Check in at first checkpoint (GPS + QR scan)
    → Quest clue unlocked
→ Trek progresses: each checkpoint = XP + milestone payment to guide
→ Final checkpoint: guide confirms completion
    → Remaining escrow released to guide
    → Completion cNFT minted to tourist wallet
→ Leave review → guide reputation updated on-chain
→ View achievement collection → climb leaderboard
```

### Guide Journey

```
Apply on platform → Submit credentials (license, ID, references)
→ Admin verifies → Profile created with on-chain reputation PDA
→ Create service listing → Receive bookings → Accept → Escrow funded
→ Lead trek → Confirm tourist check-ins at each checkpoint
→ Complete trek → Final milestone released
→ Receive review → Reputation score updated on-chain
→ After 50 completions → "Master Guide" soul-bound badge
```

### Check-in System

Check-in at trail checkpoints requires GPS proximity (within 500m) **and** a guide co-signature. No honor system. No fake check-ins. The guide's wallet signature is recorded alongside every completion.

### Dispute Resolution

```
Tourist reports problem → Selects category (no-show / safety / billing / quality)
→ Escrow frozen
→ Admin reviews evidence within 48 hours
→ Decision: refund / partial release / dismiss
→ Escrow resolved accordingly
→ Repeat offenders suspended after threshold
```

---

## Data Model

Core tables: `users`, `guides`, `places`, `routes`, `route_checkpoints`, `quests`, `services`, `bookings`, `check_ins`, `reviews`, `disputes`, `completion_proofs`.

Row-Level Security enforces:
- Public read on guides, places, routes, and reviews
- Users can only modify their own records
- Bookings visible to tourist, guide, and admin only
- Admin has full access

A materialized view computes the leaderboard from XP, completions, and unique places visited.

---

## Environment Variables

### Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | Mapbox GL access token |
| `NEXT_PUBLIC_SOLANA_RPC` | — | Override Solana RPC endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side Supabase key (never expose to browser) |

---

## Roadmap

### MVP (Days 1–7) — It works, it's real

- [ ] Supabase schema deployed with seed data
- [ ] Supabase Auth (email signup + wallet connect)
- [ ] Frontend: home page, quest browser, guide profiles, booking flow
- [ ] `tourchain_reputation` deployed to devnet
- [ ] GPS proximity check-in flow
- [ ] Booking creates Supabase record + SOL escrow stub on devnet
- [ ] Guide dashboard: view bookings, confirm completions
- [ ] Review submission → on-chain reputation update
- [ ] Mobile-responsive

### V1 (Days 8–11) — It's impressive

- [ ] `tourchain_escrow` with real SOL milestone release
- [ ] `tourchain_proof` with Bubblegum cNFT minting
- [ ] Admin panel: guide verification, dispute review
- [ ] Leaderboard (materialized view + frontend)
- [ ] QR code check-in at partner locations
- [ ] Quest system with story text and XP rewards
- [ ] Polish: animations, loading states, error handling

### V2 (Post-hackathon) — It's a company

- [ ] USDC escrow (real SPL token transfers)
- [ ] Arweave permanent NFT metadata
- [ ] Tourist mobile app (React Native)
- [ ] Nepal Tourism Board API + permit verification
- [ ] Guide payout via eSewa / bank integration
- [ ] Multi-language: English, Nepali, Chinese, Korean
- [ ] 50+ verified guides in Kathmandu, Pokhara, and Lukla

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
# Create a feature branch
git checkout -b feat/your-feature

# Build and test
anchor build
anchor test

# Submit PR
```

---

## License

MIT © 2024–2026 TourChain

---

*Built for Nepal's trekking community. The blockchain is infrastructure, not UI — tourists should see "Book Now", not "Initialize Escrow PDA".*
