"use client";

import { useEffect, useState, useRef } from "react";

type Proof = {
  id: string;
  booking_id: string;
  nft_mint_address: string | null;
  metadata_uri: string | null;
  created_at: string;
  route?: { name?: string } | null;
};

const DEMO_PROOFS: Proof[] = [
  { id: "d1", booking_id: "b1", nft_mint_address: "9wQ3rF...dM1", metadata_uri: "ipfs://QmX9...proof1", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), route: { name: "Poon Hill Trek" } },
  { id: "d2", booking_id: "b2", nft_mint_address: "GsM7tK...dM2", metadata_uri: "ipfs://QmY2...proof2", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), route: { name: "Annapurna Circuit" } },
  { id: "d3", booking_id: "b3", nft_mint_address: "HrP4nQ...dM3", metadata_uri: "ipfs://QmZ8...proof3", created_at: new Date(Date.now() - 86400000 * 9).toISOString(), route: { name: "Everest Base Camp" } },
  { id: "d4", booking_id: "b4", nft_mint_address: "KwL6mS...dM4", metadata_uri: "ipfs://QmW5...proof4", created_at: new Date(Date.now() - 86400000 * 14).toISOString(), route: { name: "Langtang Valley" } },
];

const EMOJIS = ["🏔️", "⛰️", "🌄", "🗺️", "🧗", "🏕️"];
const COLORS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-red-600",
  "from-purple-600 to-pink-600",
];

function ProofCard({ proof, index }: { proof: Proof; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(timer);
  }, [index]);

  const short = (s: string | null) => (s ? s.slice(0, 6) + "…" + s.slice(-4) : "pending");
  const emoji = EMOJIS[index % EMOJIS.length];
  const gradient = COLORS[index % COLORS.length];
  const date = new Date(proof.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      ref={ref}
      className="cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        perspective: "1000px",
      }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          height: "220px",
        }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between shadow-xl`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-between items-start">
            <span className="text-4xl">{emoji}</span>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
              NFT Proof
            </span>
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-widest mb-1">{date}</p>
            <h3 className="text-white text-xl font-bold leading-tight">{proof.route?.name ?? "Journey Proof"}</h3>
            <p className="text-white/60 text-xs mt-2">Tap to reveal on-chain details →</p>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-white/40" />
            ))}
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl bg-gray-900 p-5 flex flex-col justify-between shadow-xl border border-white/10"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-3">On-Chain Data</p>
            <div className="space-y-2">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/40 text-xs">Mint Address</p>
                <p className="text-white font-mono text-sm">{short(proof.nft_mint_address)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/40 text-xs">Metadata URI</p>
                <p className="text-white font-mono text-sm truncate">{short(proof.metadata_uri)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {proof.nft_mint_address && (
              <a
                href={`https://explorer.solana.com/address/${proof.nft_mint_address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold py-2 rounded-lg text-center transition-colors"
              >
                View on Explorer ↗
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              ↩ Flip Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  const [count, setCount] = useState(0);
  const target = typeof value === "number" ? value : 0;

  useEffect(() => {
    if (typeof value !== "number") return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(t); }
      else setCount(start);
    }, 30);
    return () => clearInterval(t);
  }, [target, value]);

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{typeof value === "number" ? count : value}</div>
      <div className="text-white/60 text-xs uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function VibePage() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proofs");
        const payload = await res.json();
        if (res.ok && payload.proofs?.length) {
          setProofs(payload.proofs);
        } else {
          setProofs(DEMO_PROOFS);
        }
      } catch {
        setProofs(DEMO_PROOFS);
      }
      setLoaded(true);
    };
    void load();
  }, []);

  const displayed = proofs.filter((p) => {
    if (filter === "minted") return !!p.nft_mint_address;
    if (filter === "pending") return !p.nft_mint_address;
    return true;
  });

  const handleShare = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2027 100%)" }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #3b82f6, transparent)", animation: "pulse 4s ease-in-out infinite" }} />
        <div className="absolute bottom-32 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)", animation: "pulse 6s ease-in-out infinite 2s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "radial-gradient(circle, #10b981, transparent)", animation: "pulse 5s ease-in-out infinite 1s" }} />
      </div>

      <div className="relative z-10 pt-28 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-white/70 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live on Solana Devnet
          </div>
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, serif", textShadow: "0 0 40px rgba(59,130,246,0.5)" }}>
            🏔️ Himalayan Vibe
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Your verified journey proofs, minted as NFTs on-chain. Each card holds immutable proof of your Himalayan adventure.
          </p>
          <button
            onClick={handleShare}
            className="mt-6 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all"
          >
            {copied ? "✅ Link Copied!" : "🔗 Share My Vibes"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatBadge value={proofs.length} label="Total Journeys" icon="🗺️" />
          <StatBadge value={proofs.filter(p => !!p.nft_mint_address).length} label="Minted NFTs" icon="🎖️" />
          <StatBadge value={proofs.filter(p => !p.nft_mint_address).length} label="Pending Mint" icon="⏳" />
          <StatBadge value={loaded ? "Live" : "…"} label="Chain Status" icon="⛓️" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8 justify-center">
          {["all", "minted", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                filter === f
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
              }`}
            >
              {f === "all" ? "All Proofs" : f === "minted" ? "✅ Minted" : "⏳ Pending"}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {!loaded ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[220px] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🧗</div>
            <p className="text-white/50 text-lg">No proofs found for this filter.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((proof, i) => (
              <ProofCard key={proof.id} proof={proof} index={i} />
            ))}
          </div>
        )}

        {/* Footer hint */}
        <p className="text-center text-white/30 text-sm mt-12">
          Tap any card to reveal on-chain proof data • Powered by Solana
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0.35; }
        }
      `}</style>
    </main>
  );
}
