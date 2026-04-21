# Tourism Chain Nepal

**A Solana-powered decentralized tourism ecosystem — connecting trekkers, local operators, and the Himalayan wilderness on-chain.**

Built for the [Colosseum Hackathon](https://www.colosseum.org/).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Program Addresses](#program-addresses)
- [Core Flows](#core-flows)
- [SDK](#sdk)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Tourism Chain Nepal reimagines how adventure tourism operates in Nepal by eliminating trust friction between tourists and local operators through transparent, programmable on-chain infrastructure.

**The problems it solves:**

| Problem | Solution |
|---|---|
| Operators vanish with deposits | Milestone-based USDC escrow — funds release in 3 tranches as the trek progresses |
| Fake reviews and unverifiable credentials | On-chain reputation scores, staked deposits, and DAO-governed operator verification |
| No proof of adventure | Compressed NFT badges minted at GPS-verified trail checkpoints |
| Carbon-blind travel | Per-booking CO₂ footprint tracking with on-chain offset retirement |
| No safety net at altitude | Parametric SOS insurance — trigger a rescue and receive automatic payout above 5,000m |
| Loyalty programs that disappear | `$TREK` token with time-locked staking that accrues governance weight |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          User Browser                                │
│                   Next.js 16 · Tailwind CSS 4                        │
│               Phantom Wallet Adapter · Mapbox GL                     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS / WS
             ┌───────────────┴───────────────┐
             │                               │
   ┌─────────▼──────────┐        ┌──────────▼──────────────┐
   │   Express.js API   │        │     Solana Devnet RPC    │
   │   (port 3001)      │        │  (@solana/web3.js direct)│
   │                    │        └──────────┬───────────────┘
   │  ┌──────────────┐  │                   │
   │  │  MongoDB     │  │        ┌──────────▼───────────────┐
   │  │  (Mongoose)  │  │        │    Anchor Programs (9)   │
   │  └──────────────┘  │        │                          │
   │                    │        │  tourism_registry  ✅    │
   │  ┌──────────────┐  │        │  booking_escrow    🔨    │
   │  │ QR Service   │◄─┼────────│  experience_nft    🔨    │
   │  │ HMAC-SHA256  │  │        │  loyalty_token     🔨    │
   │  └──────────────┘  │        │  dao_governance    🔨    │
   │                    │        │  route_registry    🔨    │
   │  ┌──────────────┐  │        │  carbon_credits    🔨    │
   │  │  Bubblegum   │◄─┼────────│  pricing_oracle    🔨    │
   │  │  Service     │  │        │  sos_insurance     🔨    │
   │  └──────────────┘  │        └──────────────────────────┘
   └────────────────────┘                   │
                                            │ Metaplex Bubblegum CPI
                                 ┌──────────▼───────────────┐
                                 │   Merkle Tree (cNFTs)    │
                                 │   Experience Badges      │
                                 └──────────────────────────┘
```

> ✅ Deployed to devnet · 🔨 Implemented, pending deployment

### Data Flow — Booking Lifecycle

```
Tourist                      Platform                    Operator
   │                            │                           │
   │── connect wallet ─────────►│                           │
   │── search operators ────────►│◄── registered on-chain ──│
   │                            │                           │
   │── create_booking() ────────►│  lock USDC in PDA vault  │
   │                            │                           │
   │                  ◄── confirmed ──────────────────────►│
   │                            │                           │
   │      [Trek day 1]          │                           │
   │── check_in at checkpoint ─►│── release_milestone(0) ──►│ +30% USDC
   │   ← cNFT badge minted ─────│                           │
   │                            │                           │
   │      [Trek day 3]          │                           │
   │── check_in at camp ────────►│── release_milestone(1) ──►│ +40% USDC
   │                            │                           │
   │      [Trek complete]       │                           │
   │── complete_booking() ──────►│── release_milestone(2) ──►│ +30% USDC
   │   ← experience NFT ─────────│                           │
   │   ← $TREK rewards ──────────│                           │
```

---

## Smart Contracts

All programs are written in Rust using the [Anchor framework](https://www.anchor-lang.com/).

### `tourism_registry` — Operator Registry & Reputation

**Program ID:** `2GWdm3guUBQBLdA3VB9ECAwzN6UdpEMgs2VrKHiKfBXy`

The backbone of the ecosystem. Operators stake SOL to register, creating skin-in-the-game accountability.

| Instruction | Description |
|---|---|
| `register_operator` | Stake SOL, set category (Guide / Teahouse / Agency / Transport / Accommodation), store IPFS metadata URI |
| `update_operator` | Update name or metadata URI |
| `submit_review` | Tourist submits 1–5 star rating; updates operator's rolling reputation score (normalized 0–100) |

**Accounts:**
- `OperatorAccount` — PDA seeded `["operator", authority]`
- `ReviewAccount` — PDA seeded `["review", operator, tourist]` (one review per tourist/operator pair)

---

### `booking_escrow` — Milestone-Based USDC Escrow

Trustless payments: funds leave the tourist's wallet and only reach the operator when milestones are confirmed.

| Instruction | Description |
|---|---|
| `create_booking` | Lock USDC in PDA vault with service type, schedule, and IPFS trip details |
| `confirm_booking` | Operator confirms they will fulfill the booking |
| `release_milestone` | Release 30% / 40% / 30% of escrowed funds on milestone 0 / 1 / 2 |
| `complete_booking` | Mark booking complete; triggers final fund release |

**BookingStatus FSM:** `Pending → Confirmed → Completed | Disputed | Cancelled`

**Dispute deadline:** 48 hours after `end_time` — enforced on-chain.

---

### `experience_nft` — Compressed NFT Trophies

Every completed trek is immortalized as a Metaplex Bubblegum compressed NFT, costing a fraction of a cent to mint.

| Instruction | Description |
|---|---|
| `mint_experience_nft` | CPI to Bubblegum — mint a cNFT with trail name, peak altitude, date, and weather metadata |

**Metadata fields:** `trail`, `altitude (m)`, `date (unix)`, `weather`

---

### `loyalty_token` — $TREK Staking

| Instruction | Description |
|---|---|
| `earn_trek` | Mint $TREK to a tourist's ATA on booking completion |
| `stake_trek` | Time-lock $TREK into a vault PDA; accrues DAO voting weight |
| `unstake_trek` | Withdraw after lock duration expires |

**StakeAccount PDA** seeded `["stake", owner]` — tracks amount, start time, end time.

---

### `dao_governance` — On-Chain Governance

$TREK holders govern the ecosystem. Vote weight is proportional to staked $TREK.

| Instruction | Description |
|---|---|
| `create_proposal` | Submit a governance proposal (title, description, type) |
| `cast_vote` | Cast weighted vote for or against an active proposal |

**ProposalType variants:**
- `SlashOperator` — penalize a bad actor's staked SOL
- `AddVerifiedRoute` — whitelist a new trekking route
- `UpdateFeeStructure` — modify platform fee parameters
- `TreasurySpend` — allocate from the DAO treasury

---

### `route_registry` — GPS-Verified Trail Checkpoints

Trekking routes are registered on-chain with a series of checkpoints. Operators prove service delivery by recording on-chain check-ins at each point, triggering cNFT badge mints.

---

### `carbon_credits` — CO₂ Offset Tracking

Every booking calculates a CO₂ footprint based on distance and transport mode, mints an offset token, and allows permanent on-chain retirement.

| Transport | Footprint |
|---|---|
| Flight | 0.25 kg CO₂ / km |
| Bus | 0.05 kg CO₂ / km |
| Trekking | 0.01 kg CO₂ / km |

| Instruction | Description |
|---|---|
| `mint_offset` | Calculate and record CO₂ footprint for a booking |
| `retire_offset` | Permanently retire offset credits (idempotent) |

---

### `pricing_oracle` — Dynamic Peak-Season Pricing

| Instruction | Description |
|---|---|
| `get_price` | Apply seasonal multiplier to base price (1.4× during Oct–Nov and Mar–May peaks) |
| `update_pricing_config` | Admin updates peak season flag (Switchboard oracle integration planned) |

Peak season surge is capped at 2× base price.

---

### `sos_insurance` — Parametric Emergency Insurance

One instruction from any altitude above 5,000m triggers an on-chain SOS with GPS coordinates and auto-initiates a $500 USDC payout.

| Instruction | Description |
|---|---|
| `trigger_sos` | Record GPS lat/long/altitude and timestamp on-chain; emit `SOSTriggeredEvent` |
| `payout_insurance` | Verify altitude threshold (> 5,000m) and pay out insurance proceeds |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Smart Contracts | Rust + Anchor | `anchor-lang 1.0.0` / Rust `1.89.0` |
| Frontend | Next.js + React | `16.2.4` / `19.2.4` |
| Styling | Tailwind CSS + Framer Motion | `^4` / `^12` |
| Backend | Express.js + Mongoose | `^5.2.1` / `^9.4.1` |
| Database | MongoDB | via Mongoose `^9.4.1` |
| NFTs | Metaplex Bubblegum (cNFTs) | `mpl-bubblegum ^5.0.2` |
| Maps | Mapbox GL | `^3.22.0` |
| Wallet | Phantom (+ Solana Wallet Adapter) | `@solana/wallet-adapter` |
| Package Manager | Yarn (workspace monorepo) | — |

---

## Repository Structure

```
Tour_chain/
├── programs/                    # Anchor smart contracts (Rust)
│   ├── tourism_registry/        # ✅ Deployed — operator registry + reputation
│   ├── booking_escrow/          # Milestone-based USDC escrow
│   ├── experience_nft/          # Compressed NFT experience badges
│   ├── loyalty_token/           # $TREK token staking
│   ├── dao_governance/          # Proposal + weighted voting
│   ├── route_registry/          # GPS checkpoint verification
│   ├── carbon_credits/          # CO₂ offset tracking + retirement
│   ├── pricing_oracle/          # Peak season dynamic pricing
│   └── sos_insurance/           # Parametric emergency insurance
│
├── apps/
│   └── web/                     # Next.js 16 frontend (Himalayan Aurora UI)
│       └── src/
│           ├── app/             # App Router pages
│           └── components/      # Wallet provider, Map, UI components
│
├── backend/                     # Express.js API + Solana relay
│   └── src/
│       ├── routes/              # auth, visits, leaderboard, nfts, actions
│       └── services/            # solanaService, bubblegumService, qrService
│
├── sdk/                         # TypeScript SDK for program interactions
│   └── src/
│       └── index.ts             # TourismChain client class
│
├── Anchor.toml                  # Anchor workspace config
├── Cargo.toml                   # Rust workspace
└── vercel.json                  # Serverless deployment config
```

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) `1.89+`
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) `1.18+`
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) `0.32+`
- [Node.js](https://nodejs.org/) `18+`
- [Yarn](https://yarnpkg.com/) `1.22+`
- A [Phantom](https://phantom.app/) wallet funded with devnet SOL

### 1. Clone and Install

```bash
git clone https://github.com/Since2024/Tour_chain.git
cd Tour_chain
yarn install
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in the required values — see [Environment Variables](#environment-variables).

### 3. Build Anchor Programs

```bash
anchor build
```

IDL artifacts will be generated at `target/idl/`. The SDK and backend depend on these.

### 4. Deploy to Devnet

```bash
solana config set --url devnet
anchor deploy
```

Update `Anchor.toml` with the new program IDs, then rebuild.

### 5. Start the Backend

```bash
cd backend
node src/index.js
# API running at http://localhost:3001
```

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
| `tourism_registry` | Devnet | `2GWdm3guUBQBLdA3VB9ECAwzN6UdpEMgs2VrKHiKfBXy` |
| `booking_escrow` | — | Pending deployment |
| `experience_nft` | — | Pending deployment |
| `loyalty_token` | — | Pending deployment |
| `dao_governance` | — | Pending deployment |
| `route_registry` | — | Pending deployment |
| `carbon_credits` | — | Pending deployment |
| `pricing_oracle` | — | Pending deployment |
| `sos_insurance` | — | Pending deployment |

---

## Core Flows

### Register as an Operator

1. Connect Phantom wallet
2. Navigate to **Become an Operator**
3. Choose category (Guide / Teahouse / Agency / Transport / Accommodation)
4. Upload profile to IPFS, enter the URI
5. Stake SOL — this is your on-chain reputation deposit
6. Submit — calls `register_operator` on `tourism_registry`

### Book a Trek

1. Browse operators on the **Explore** page
2. Select dates, service type, and confirm pricing
3. Connect wallet and approve USDC transfer to the escrow PDA
4. Your booking status is `Pending` until the operator confirms

### Collect Your Badges

QR codes are placed at verified trail checkpoints. Scan → authenticate → a compressed NFT badge is minted to your wallet proving you were there.

### Governance

1. Stake `$TREK` tokens to earn voting weight
2. Navigate to **DAO** to browse active proposals
3. Cast a weighted vote — one vote per wallet per proposal, enforced by PDA

---

## SDK

The TypeScript SDK provides a typed client for all nine programs.

```typescript
import { TourismChain } from './sdk/src';
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

const connection = new Connection('https://api.devnet.solana.com');
const provider = new AnchorProvider(connection, new Wallet(keypair), {});

const client = new TourismChain(provider);

// Register an operator
await client.getTourismRegistryProgram().methods
  .registerOperator('Himalayan Guides Co.', { guide: {} }, metadataUri, stakeAmount)
  .accounts({ authority: wallet.publicKey, systemProgram: SystemProgram.programId })
  .rpc();
```

> **Note:** Run `anchor build` first to generate IDL artifacts before using the SDK.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `SOLANA_RPC` | ✅ | Solana RPC endpoint (devnet or mainnet) |
| `WALLET_PATH` | ✅ | Absolute path to Solana keypair JSON file |
| `MERKLE_TREE_PUBKEY` | ✅ | Pre-provisioned Bubblegum Merkle tree address |
| `JWT_SECRET` | ✅ | Secret for JWT signing |
| `PORT` | — | API port (default: `3001`) |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins |

### Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | Mapbox GL access token |
| `NEXT_PUBLIC_SOLANA_RPC` | — | Override Solana RPC endpoint |
| `NEXT_PUBLIC_API_URL` | — | Backend API base URL (default: `http://localhost:3001`) |

---

## Roadmap

- [ ] Deploy all 9 programs to devnet
- [ ] Implement USDC SPL token transfers in `booking_escrow`
- [ ] Wire Bubblegum CPI in `experience_nft` and `route_registry`
- [ ] Implement `earn_trek` mint authority in `loyalty_token`
- [ ] Add VoteRecord PDA to `dao_governance` (one-vote-per-wallet enforcement)
- [ ] Integrate Switchboard oracle for live weather/pricing data
- [ ] Add wallet signature verification to auth endpoints
- [ ] Write Anchor integration test suite
- [ ] Set up CI/CD pipeline
- [ ] Provision Merkle tree and document setup
- [ ] Mainnet deployment

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

MIT © 2024 Tourism Chain Nepal

---

*Built with love for Nepal's trekking community at the Colosseum Hackathon.*
