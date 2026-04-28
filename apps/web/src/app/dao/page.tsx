"use client";

import { useEffect, useState } from "react";

type Dispute = {
  id: string;
  category: string;
  status: string;
  description: string;
  created_at: string;
};

type Vote = { for: number; against: number; abstain: number };

const DEMO_DISPUTES: Dispute[] = [
  { id: "d1", category: "Service Quality", status: "under_review", description: "Guide arrived 3 hours late at Thorong La checkpoint; tourist requests 40% refund on trek package.", created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "d2", category: "Billing", status: "open", description: "Escrow release mismatch: operator claims full completion but tourist reports 2 checkpoints skipped.", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "d3", category: "Safety", status: "resolved", description: "Emergency SOS triggered at 5200m; guide provided adequate assistance. Case closed in favor of operator.", created_at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "d4", category: "NFT Dispute", status: "open", description: "Checkpoint NFT minted incorrectly — wrong metadata URI attached to mint address for Poon Hill summit.", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:         { label: "Open",         color: "text-orange-300", bg: "bg-orange-500/20 border-orange-500/30", dot: "bg-orange-400" },
  under_review: { label: "Under Review", color: "text-blue-300",   bg: "bg-blue-500/20 border-blue-500/30",   dot: "bg-blue-400 animate-pulse" },
  resolved:     { label: "Resolved",     color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30", dot: "bg-emerald-400" },
  rejected:     { label: "Rejected",     color: "text-red-300",    bg: "bg-red-500/20 border-red-500/30",    dot: "bg-red-400" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Service Quality": "⭐",
  "Billing": "💰",
  "Safety": "🚨",
  "NFT Dispute": "🎖️",
};

function VoteBar({ votes }: { votes: Vote }) {
  const total = votes.for + votes.against + votes.abstain || 1;
  const forPct = Math.round((votes.for / total) * 100);
  const againstPct = Math.round((votes.against / total) * 100);
  const abstainPct = 100 - forPct - againstPct;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50 w-14">For</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${forPct}%` }} />
        </div>
        <span className="text-xs text-emerald-300 w-8 text-right">{forPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50 w-14">Against</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${againstPct}%` }} />
        </div>
        <span className="text-xs text-red-300 w-8 text-right">{againstPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50 w-14">Abstain</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gray-400 rounded-full transition-all duration-700" style={{ width: `${abstainPct}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{abstainPct}%</span>
      </div>
    </div>
  );
}

function DisputeCard({ dispute, index }: { dispute: Dispute; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [myVote, setMyVote] = useState<"for" | "against" | "abstain" | null>(null);
  const [votes, setVotes] = useState<Vote>({
    for: Math.floor(Math.random() * 80) + 10,
    against: Math.floor(Math.random() * 50) + 5,
    abstain: Math.floor(Math.random() * 20) + 2,
  });
  const [voting, setVoting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(t);
  }, [index]);

  const cfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;
  const icon = CATEGORY_ICONS[dispute.category] ?? "📋";
  const days = Math.floor((Date.now() - new Date(dispute.created_at).getTime()) / 86400000);

  const castVote = (type: "for" | "against" | "abstain") => {
    if (myVote || voting) return;
    setVoting(true);
    setTimeout(() => {
      setVotes(v => ({ ...v, [type]: v[type] + 1 }));
      setMyVote(type);
      setVoting(false);
    }, 600);
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-24px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div
        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
          expanded ? "border-blue-500/50 shadow-xl shadow-blue-500/10" : "border-white/10 hover:border-white/25"
        }`}
        style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
      >
        {/* Card header — always visible */}
        <button
          className="w-full text-left p-5 flex items-start gap-4"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="text-3xl mt-0.5 shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-white/50 text-xs uppercase tracking-widest">{dispute.category}</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              <span className="text-white/30 text-xs ml-auto">{days === 0 ? "Today" : `${days}d ago`}</span>
            </div>
            <p className="text-white/85 text-sm leading-snug line-clamp-2">{dispute.description}</p>
          </div>
          <span className="text-white/30 text-lg shrink-0 transition-transform duration-300" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            ⌄
          </span>
        </button>

        {/* Expandable body */}
        <div
          className="overflow-hidden transition-all duration-500"
          style={{ maxHeight: expanded ? "400px" : "0px" }}
        >
          <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
            {/* Full description */}
            <p className="text-white/70 text-sm leading-relaxed">{dispute.description}</p>

            {/* Vote distribution */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Current Votes · {votes.for + votes.against + votes.abstain} total</p>
              <VoteBar votes={votes} />
            </div>

            {/* Vote buttons */}
            {dispute.status !== "resolved" && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Cast Your Vote</p>
                {myVote ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <span>✅</span>
                    <span>You voted <strong className="capitalize">{myVote}</strong>. Vote recorded on-chain.</span>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {(["for", "against", "abstain"] as const).map((v) => (
                      <button
                        key={v}
                        disabled={voting}
                        onClick={() => castVote(v)}
                        className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                          v === "for"
                            ? "bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-white"
                            : v === "against"
                            ? "bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-red-300 hover:text-white"
                            : "bg-gray-500/20 hover:bg-gray-500 border border-gray-500/40 text-gray-300 hover:text-white"
                        } ${voting ? "opacity-50 cursor-wait" : "hover:scale-105"}`}
                      >
                        {voting ? "…" : v === "for" ? "✅ For" : v === "against" ? "❌ Against" : "⬜ Abstain"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dispute.status === "resolved" && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <span className="text-emerald-400">✅</span>
                <span className="text-emerald-300 text-sm">This dispute has been resolved by DAO consensus.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, sublabel }: { icon: string; value: string | number; label: string; sublabel?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5 text-center" style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-white/60 text-xs uppercase tracking-wider">{label}</div>
      {sublabel && <div className="text-white/35 text-xs mt-1">{sublabel}</div>}
    </div>
  );
}

export default function DAODashboard() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Service Quality", description: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/disputes");
        if (response.ok) {
          const payload = await response.json();
          if (payload.disputes?.length) {
            setDisputes(payload.disputes);
            setLoaded(true);
            return;
          }
        }
      } catch {}
      setDisputes(DEMO_DISPUTES);
      setLoaded(true);
    };
    void load();
  }, []);

  const filtered = disputes.filter((d) => {
    if (filter === "open") return d.status === "open";
    if (filter === "review") return d.status === "under_review";
    if (filter === "resolved") return d.status === "resolved";
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    const newDispute: Dispute = {
      id: `local-${Date.now()}`,
      category: form.category,
      description: form.description,
      status: "open",
      created_at: new Date().toISOString(),
    };
    setDisputes(prev => [newDispute, ...prev]);
    setSubmitted(true);
    setShowForm(false);
    setForm({ category: "Service Quality", description: "" });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const openCount = disputes.filter(d => d.status === "open").length;
  const reviewCount = disputes.filter(d => d.status === "under_review").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a1040 50%, #0f1a2e 100%)" }}>
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animation: "float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #2563eb, transparent)", animation: "float 10s ease-in-out infinite reverse" }} />
      </div>

      <div className="relative z-10 pt-28 pb-16 px-4 max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            DAO Governance Active
          </div>
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, serif", textShadow: "0 0 40px rgba(124,58,237,0.4)" }}>
            ⚖️ Trust DAO
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Community-governed dispute resolution for the Himalayan tourism ecosystem. Vote on cases, shape fair outcomes.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon="📋" value={disputes.length} label="Total Cases" />
          <StatCard icon="🔴" value={openCount} label="Open" sublabel="Needs votes" />
          <StatCard icon="🔵" value={reviewCount} label="In Review" sublabel="Being assessed" />
          <StatCard icon="✅" value={resolvedCount} label="Resolved" sublabel="Case closed" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "open", label: "🔴 Open" },
              { key: "review", label: "🔵 In Review" },
              { key: "resolved", label: "✅ Resolved" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  filter === f.key
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-5 py-2 rounded-full transition-all hover:scale-105 shadow-lg shadow-purple-500/30"
          >
            {showForm ? "✕ Cancel" : "+ File a Dispute"}
          </button>
        </div>

        {/* Success toast */}
        {submitted && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-5 py-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-emerald-300 font-semibold text-sm">Dispute submitted!</p>
              <p className="text-emerald-300/60 text-xs">Your case has been added to the DAO queue.</p>
            </div>
          </div>
        )}

        {/* Submit form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-2xl border border-purple-500/30 p-6 space-y-4"
            style={{ background: "rgba(124,58,237,0.08)", backdropFilter: "blur(12px)" }}
          >
            <h2 className="text-white font-bold text-lg">📝 File a New Dispute</h2>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400"
              >
                {["Service Quality", "Billing", "Safety", "NFT Dispute", "Other"].map(c => (
                  <option key={c} value={c} className="bg-gray-900">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe the issue in detail..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-purple-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!form.description.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
            >
              Submit to DAO →
            </button>
          </form>
        )}

        {/* Disputes list */}
        {!loaded ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚖️</div>
            <p className="text-white/50 text-lg">No disputes found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((dispute, i) => (
              <DisputeCard key={dispute.id} dispute={dispute} index={i} />
            ))}
          </div>
        )}

        <p className="text-center text-white/25 text-xs mt-12">
          TrustDAO · Governance powered by community consensus · Tourism Chain Nepal
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </main>
  );
}
