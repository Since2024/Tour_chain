"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, Clock, TrendingUp, ChevronRight, Loader2, Mountain, Send } from "lucide-react";

type Recommendation = {
  rank: number;
  name: string;
  region: string;
  difficulty: string;
  duration_days: number;
  price_usd: number;
  altitude_m: number;
  match_score: number;
  pros: string[];
  cons: string[];
  why: string;
  route_id: string;
  image_url: string;
};

type PlannerResponse = {
  summary: string;
  recommendations: Recommendation[];
  tips: string[];
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-600 bg-emerald-50 border-emerald-200",
  moderate: "text-amber-600 bg-amber-50 border-amber-200",
  challenging: "text-orange-600 bg-orange-50 border-orange-200",
  extreme: "text-red-600 bg-red-50 border-red-200",
};

const EXAMPLE_PROMPTS = [
  "I'm a beginner with 7 days, budget $500, want mountain views",
  "Experienced trekker, 14 days, want to reach 5000m+",
  "Family trip with kids, easy trails, 5 days max",
  "Solo adventure, moderate difficulty, off the beaten path",
];

export default function PlannerPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const handleSubmit = async (prompt?: string) => {
    const query = prompt ?? input;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    if (prompt) setInput(prompt);

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to get recommendations");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen pb-20"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1a2744 40%, #0f2027 100%)" }}
    >
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-32 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)", animation: "pulse 5s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-40 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, #f97316, transparent)", animation: "pulse 7s ease-in-out infinite 2s" }}
        />
      </div>

      <div className="relative z-10 pt-28 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-2 text-sm text-indigo-300 mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Trek Recommendations
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold text-white mb-4"
            style={{ fontFamily: "Georgia, serif", textShadow: "0 0 40px rgba(99,102,241,0.4)" }}
          >
            🤖 AI Trip Planner
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Describe your dream trek in plain English. Our smart matching engine finds your perfect Himalayan route.
          </p>
        </div>

        {/* Input */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6">
          <label className="block text-white/70 text-sm font-semibold mb-3 uppercase tracking-wider">
            Tell us about your ideal trek
          </label>
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="e.g. I have 10 days, moderate fitness, budget around $800, want stunning mountain views and cultural experiences..."
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 resize-none text-base"
            />
            <button
              onClick={() => void handleSubmit()}
              disabled={loading || !input.trim()}
              className="absolute bottom-3 right-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all hover:scale-105"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {/* Example prompts */}
          <div className="mt-4">
            <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void handleSubmit(p)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 text-white/60 hover:text-white px-3 py-1.5 rounded-full transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative">
                <Mountain className="w-16 h-16 text-indigo-400 opacity-30" />
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-white/60 text-sm">Analyzing your preferences and matching routes…</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-white/80 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h2 className="text-white font-bold text-xl mb-4" style={{ fontFamily: "Georgia, serif" }}>
                Top {result.recommendations.length} Recommendations
              </h2>
              <div className="space-y-4">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={rec.route_id}
                    onClick={() => setSelected(selected === i ? null : i)}
                    className="cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden"
                    style={{
                      background: selected === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
                      borderColor: selected === i ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)",
                      boxShadow: selected === i ? "0 0 30px rgba(99,102,241,0.15)" : "none",
                    }}
                  >
                    {/* Card header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Rank badge */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                            style={{
                              background: i === 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : i === 1 ? "linear-gradient(135deg,#94a3b8,#64748b)" : "linear-gradient(135deg,#b45309,#92400e)",
                            }}
                          >
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-lg leading-tight">{rec.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-white/50 text-xs flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {rec.region}
                              </span>
                              <span className="text-white/50 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {rec.duration_days} days
                              </span>
                              <span className="text-white/50 text-xs flex items-center gap-1">
                                <Mountain className="w-3 h-3" /> {(rec.altitude_m / 1000).toFixed(1)}k m
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLOR[rec.difficulty.toLowerCase()] ?? DIFFICULTY_COLOR.moderate}`}
                              >
                                {rec.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-white font-bold text-lg">${rec.price_usd}</div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-bold">{rec.match_score}% match</span>
                          </div>
                        </div>
                      </div>

                      {/* Match bar */}
                      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${rec.match_score}%`,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                          }}
                        />
                      </div>

                      <p className="text-white/50 text-sm mt-3 italic">&ldquo;{rec.why}&rdquo;</p>
                    </div>

                    {/* Expanded details */}
                    {selected === i && (
                      <div className="border-t border-white/10 p-5 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">✅ Pros</p>
                            <ul className="space-y-1">
                              {rec.pros.map((p) => (
                                <li key={p} className="text-white/70 text-sm flex items-start gap-2">
                                  <span className="text-emerald-400 mt-0.5">+</span> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">⚠️ Cons</p>
                            <ul className="space-y-1">
                              {rec.cons.map((c) => (
                                <li key={c} className="text-white/70 text-sm flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5">−</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Link
                          href={`/book/${rec.route_id}`}
                          className="flex items-center justify-center gap-2 w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/25"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Book This Trek <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3">💡 Planning Tips</p>
                <ul className="space-y-2">
                  {result.tips.map((tip) => (
                    <li key={tip} className="text-white/60 text-sm flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">→</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.2; }
        }
      `}</style>
    </main>
  );
}
