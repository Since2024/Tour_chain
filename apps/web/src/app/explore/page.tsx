"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, X, Grid3X3, List, SlidersHorizontal, Heart, Clock, TrendingUp, Mountain, Wind, Thermometer, ChevronRight, Star, Shield, Zap, ArrowRight } from "lucide-react";
import { DEMO_ROUTES } from "@/lib/demo/catalog";const NAVY  = "#1a2b4a";
const GREEN = "#2d6a4f";

type RouteItem = {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  duration_days: number;
  image_url: string | null;
  max_altitude_meters?: number | null;
};

type WeatherData = {
  temp_c: number;
  condition: string;
  icon: string;
  wind_kph: number;
  trek_condition: { label: string; color: string; status: string };
};

const DIFFICULTY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; dot: string }> = {
  easy:        { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Easy",        dot: "bg-emerald-400" },
  moderate:    { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Moderate",    dot: "bg-amber-400"   },
  challenging: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Challenging", dot: "bg-orange-400"  },
  hard:        { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Hard",        dot: "bg-orange-400"  },
  extreme:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Extreme",     dot: "bg-red-500"     },
};

const REGIONS = ["All", "Annapurna", "Khumbu", "Langtang", "Gorkha", "Mustang", "Kanchenjunga"];

const ROUTE_HIGHLIGHTS: Record<string, { highlights: string[]; best_season: string; trekkers: number; xp: number }> = {
  "Everest Base Camp":      { highlights: ["Namche Bazaar", "Tengboche Monastery", "Khumbu Glacier"], best_season: "Oct–Nov", trekkers: 1240, xp: 2500 },
  "Annapurna Circuit":      { highlights: ["Thorong La Pass 5416m", "Muktinath Temple", "Poon Hill"], best_season: "Oct–Nov", trekkers: 980,  xp: 2200 },
  "Poon Hill Sunrise Trek": { highlights: ["Poon Hill Sunrise", "Ghorepani Village", "Rhododendron Forest"], best_season: "Mar–Apr", trekkers: 2100, xp: 800  },
  "Langtang Valley":        { highlights: ["Kyanjin Gompa", "Langtang Village", "Tserko Ri"], best_season: "Mar–May", trekkers: 560,  xp: 1400 },
  "Mardi Himal Trek":       { highlights: ["Mardi Himal Base Camp", "Fishtail Views", "Forest Camp"], best_season: "Oct–Nov", trekkers: 420,  xp: 1100 },
  "Manaslu Circuit":        { highlights: ["Larkya La Pass 5106m", "Tsum Valley", "Restricted Area"], best_season: "Sep–Oct", trekkers: 280,  xp: 3000 },
};

function getHighlights(name: string) {
  return ROUTE_HIGHLIGHTS[name] ?? { highlights: ["Scenic trails", "Mountain views", "Local culture"], best_season: "Oct–Nov", trekkers: 300, xp: 1000 };
}

/* ── Quick-view modal ────────────────────────────────────────── */
function QuickViewModal({ route, weather, onClose }: { route: RouteItem; weather?: WeatherData; onClose: () => void }) {
  const diff = DIFFICULTY_CONFIG[route.difficulty?.toLowerCase()] ?? DIFFICULTY_CONFIG.moderate;
  const info = getHighlights(route.name);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-56">
          <Image src={route.image_url ?? "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"} alt={route.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${diff.dot}`} />{diff.label}
              </span>
              {route.max_altitude_meters && (
                <span className="text-xs bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">⛰️ {(route.max_altitude_meters/1000).toFixed(1)}k m</span>
              )}
            </div>
            <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "Georgia, serif" }}>{route.name}</h2>
            <p className="text-white/70 text-xs mt-0.5">📍 {route.region} · 🗓 {route.duration_days} days</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🧗", label: "Trekkers", value: info.trekkers.toLocaleString() },
              { icon: "⚡", label: "XP Reward", value: `+${info.xp}` },
              { icon: "📅", label: "Best Season", value: info.best_season },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                <div className="text-lg mb-0.5">{s.icon}</div>
                <div className="text-sm font-bold" style={{ color: NAVY }}>{s.value}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Route Highlights</p>
            <div className="space-y-1.5">
              {info.highlights.map((h) => (
                <div key={h} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GREEN }} />
                  {h}
                </div>
              ))}
            </div>
          </div>

          {/* Weather */}
          {weather && (
            <div className="flex items-center justify-between bg-sky-50 rounded-2xl px-4 py-3 border border-sky-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700">{weather.condition}</p>
                  <p className="text-xs text-gray-500">{weather.temp_c}°C · 💨 {weather.wind_kph} km/h</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                background: weather.trek_condition.status === "excellent" ? "#ecfdf5" : weather.trek_condition.status === "good" ? "#eff6ff" : weather.trek_condition.status === "caution" ? "#fffbeb" : "#fef2f2",
                color: weather.trek_condition.status === "excellent" ? "#059669" : weather.trek_condition.status === "good" ? "#2563eb" : weather.trek_condition.status === "caution" ? "#d97706" : "#dc2626",
              }}>
                {weather.trek_condition.label}
              </span>
            </div>
          )}

          {/* Trust badges */}
          <div className="flex gap-2">
            {[
              { icon: <Shield className="w-3 h-3" />, text: "Escrow Protected" },
              { icon: <Zap className="w-3 h-3" />,   text: "On-Chain Verified" },
              { icon: <Star className="w-3 h-3" />,   text: "NFT Certificate" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${GREEN}12`, color: GREEN }}>
                {b.icon}{b.text}
              </div>
            ))}
          </div>

          <Link
            href={`/book/${route.id}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02] shadow-lg"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${GREEN} 100%)` }}
          >
            Book This Trek <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Route Card ──────────────────────────────────────────────── */
function RouteCard({ route, index, weather, onQuickView, wishlisted, onWishlist }: {
  route: RouteItem; index: number; weather?: WeatherData;
  onQuickView: () => void; wishlisted: boolean; onWishlist: () => void;
}) {
  const prefersReduced = useReducedMotion();
  const diff = DIFFICULTY_CONFIG[route.difficulty?.toLowerCase()] ?? DIFFICULTY_CONFIG.moderate;
  const info = getHighlights(route.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25), ease: [0.16, 1, 0.3, 1] }}
      whileHover={prefersReduced ? {} : { y: -6 }}
      className="group cursor-pointer"
    >
      <div className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-black/10 transition-all duration-300">

        {/* Image */}
        <div className="relative overflow-hidden" style={{ height: "220px" }}>
          <Image
            src={route.image_url ?? "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"}
            alt={route.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              {route.max_altitude_meters && (
                <span className="text-xs bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-bold w-fit">
                  ⛰️ {(route.max_altitude_meters / 1000).toFixed(1)}k m
                </span>
              )}
              <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit" style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${diff.dot}`} />{diff.label}
              </span>
            </div>
            {/* Wishlist */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(); }}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110"
            >
              <Heart className={`w-4 h-4 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white text-lg font-bold drop-shadow-lg leading-tight">{route.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/70 text-xs flex items-center gap-1">📍 {route.region}</span>
              <span className="text-white/70 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {route.duration_days}d</span>
              <span className="text-white/70 text-xs flex items-center gap-1">⚡ +{info.xp} XP</span>
            </div>
          </div>

          {/* Hover overlay — quick view */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => { e.preventDefault(); onQuickView(); }}
              className="bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5"
            >
              Quick View <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weather strip */}
        {weather ? (
          <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between" style={{ background: "linear-gradient(90deg, #f0f9ff, #f0fdf4)" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{weather.icon}</span>
              <div>
                <p className="text-xs font-semibold text-gray-700 leading-none">{weather.condition}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Thermometer className="w-2.5 h-2.5" />{weather.temp_c}°C
                  <Wind className="w-2.5 h-2.5 ml-1" />{weather.wind_kph} km/h
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
              background: weather.trek_condition.status === "excellent" ? "#ecfdf5" : weather.trek_condition.status === "good" ? "#eff6ff" : "#fffbeb",
              color: weather.trek_condition.status === "excellent" ? "#059669" : weather.trek_condition.status === "good" ? "#2563eb" : "#d97706",
            }}>
              {weather.trek_condition.status === "excellent" ? "✅" : weather.trek_condition.status === "good" ? "🔵" : "⚠️"} {weather.trek_condition.label}
            </span>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
            <span className="text-xs text-gray-300">Loading weather…</span>
          </div>
        )}

        {/* Card footer */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />{info.trekkers.toLocaleString()} trekkers
            </span>
          </div>
          <Link
            href={`/book/${route.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-md shine"
            style={{ background: `linear-gradient(135deg, ${NAVY}, ${GREEN})` }}
          >
            Book Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm]   = useState("");
  const [region, setRegion]           = useState("All");
  const [difficulty, setDifficulty]   = useState("All");
  const [sort, setSort]               = useState<"popular" | "duration" | "altitude" | "difficulty">("popular");
  const [view, setView]               = useState<"grid" | "list">("grid");
  const [routes, setRoutes]           = useState<RouteItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [weatherMap, setWeatherMap]   = useState<Record<string, WeatherData>>({});
  const [quickView, setQuickView]     = useState<RouteItem | null>(null);
  const [wishlist, setWishlist]       = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const routesRes = await fetch("/api/routes", { cache: "force-cache" });
      const routesJson = await routesRes.json();
      const dbRoutes = (routesJson.routes ?? []) as RouteItem[];
      const finalRoutes = dbRoutes.length >= 3 ? dbRoutes : [...dbRoutes, ...DEMO_ROUTES].slice(0, 12);
      setRoutes(finalRoutes);
      setLoading(false);
      const uniqueRegions = [...new Set(finalRoutes.map((r) => r.region))];
      uniqueRegions.forEach((reg) => {
        fetch(`/api/weather?region=${encodeURIComponent(reg)}`, { cache: "force-cache" })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data) return;
            setWeatherMap((prev) => ({ ...prev, [reg]: { temp_c: data.temp_c, condition: data.condition, icon: data.icon, wind_kph: data.wind_kph, trek_condition: data.trek_condition } }));
          }).catch(() => null);
      });
    };
    void load();
  }, []);

  const toggleWishlist = (id: string) =>
    setWishlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = useMemo(() => {
    let list = routes.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.region.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRegion = region === "All" || r.region.toLowerCase().includes(region.toLowerCase());
      const matchDiff   = difficulty === "All" || r.difficulty?.toLowerCase() === difficulty.toLowerCase();
      return matchSearch && matchRegion && matchDiff;
    });
    if (sort === "duration")   list = [...list].sort((a, b) => a.duration_days - b.duration_days);
    if (sort === "altitude")   list = [...list].sort((a, b) => (b.max_altitude_meters ?? 0) - (a.max_altitude_meters ?? 0));
    if (sort === "difficulty") {
      const order: Record<string, number> = { easy: 1, moderate: 2, challenging: 3, hard: 3, extreme: 4 };
      list = [...list].sort((a, b) => (order[a.difficulty?.toLowerCase()] ?? 2) - (order[b.difficulty?.toLowerCase()] ?? 2));
    }
    if (sort === "popular") {
      list = [...list].sort((a, b) => (getHighlights(b.name).trekkers) - (getHighlights(a.name).trekkers));
    }
    return list;
  }, [routes, searchTerm, region, difficulty, sort]);

  const featured = routes[0];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f8faff 0%, #f5f0e8 50%, #f0fff4 100%)" }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2d3a5a 60%, ${GREEN} 100%)` }}>
        {/* Background image */}
        <div className="absolute inset-0 opacity-20">
          <Image src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=60" alt="" fill className="object-cover" />
        </div>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${NAVY}dd 0%, ${GREEN}99 100%)` }} />

        <div className="relative z-10 pt-28 pb-16 px-4 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 font-medium mb-5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {routes.length} Verified Routes · Live on Solana Devnet
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Discover Your <span className="italic" style={{ color: "#86efac" }}>Next Trek</span>
            </h1>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              Every route verified on-chain. Every payment protected by Solana escrow.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search routes, regions, difficulty…"
              className="w-full pl-12 pr-12 py-4 rounded-2xl text-gray-800 text-base shadow-2xl focus:outline-none focus:ring-2 focus:ring-green-400/40 bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </motion.div>

          {/* Quick stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-6 mt-8">
            {[
              { icon: "🏔️", value: `${routes.length}+`, label: "Verified Routes" },
              { icon: "🧗", value: "5,200+", label: "Trekkers" },
              { icon: "🎖️", value: "1,800+", label: "NFTs Minted" },
              { icon: "⛓️", value: "100%", label: "On-Chain" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/15">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm leading-none">{s.value}</p>
                  <p className="text-white/50 text-[10px] uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── STICKY FILTER BAR ─────────────────────────────────── */}
      <div className="sticky top-[68px] z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">

          {/* Region pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: region === r ? NAVY : "#f3f4f6",
                  color: region === r ? "white" : "#374151",
                  transform: region === r ? "scale(1.05)" : "scale(1)",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            {["All", "Easy", "Moderate", "Challenging", "Extreme"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d === "All" ? "All" : d.toLowerCase())}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: difficulty === (d === "All" ? "All" : d.toLowerCase()) ? GREEN : "#f3f4f6",
                  color: difficulty === (d === "All" ? "All" : d.toLowerCase()) ? "white" : "#374151",
                }}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Sort */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              {([["popular","🔥 Popular"],["duration","⏱ Duration"],["altitude","⛰️ Altitude"],["difficulty","💪 Difficulty"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSort(val)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: sort === val ? NAVY : "transparent", color: sort === val ? "white" : "#6b7280" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              <button onClick={() => setView("grid")} className="p-1.5 rounded-lg transition-all" style={{ background: view === "grid" ? NAVY : "transparent", color: view === "grid" ? "white" : "#9ca3af" }}>
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView("list")} className="p-1.5 rounded-lg transition-all" style={{ background: view === "list" ? NAVY : "transparent", color: view === "list" ? "white" : "#9ca3af" }}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 text-sm text-gray-500 mb-6">
          <span>{filtered.length} routes found</span>
          {searchTerm && <span>· matching &quot;<strong className="text-orange-500">{searchTerm}</strong>&quot;</span>}
        </div>
      </div>

      {/* ── FEATURED ROUTE ────────────────────────────────────── */}
      {!loading && featured && !searchTerm && region === "All" && (
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GREEN }}>🔥 Featured Route</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden cursor-pointer group"
            style={{ height: "280px" }}
            onClick={() => setQuickView(featured)}
          >
            <Image src={featured.image_url ?? "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80"} alt={featured.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />
            <div className="absolute inset-0 flex items-center">
              <div className="px-8 max-w-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-bold border border-white/20">
                    ⛰️ {featured.max_altitude_meters ? `${(featured.max_altitude_meters/1000).toFixed(1)}k m` : "High Altitude"}
                  </span>
                  <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-bold border border-white/20">
                    🗓 {featured.duration_days} days
                  </span>
                </div>
                <h2 className="text-white text-3xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>{featured.name}</h2>
                <p className="text-white/70 text-sm mb-4">📍 {featured.region} · {getHighlights(featured.name).trekkers.toLocaleString()} trekkers · +{getHighlights(featured.name).xp} XP</p>
                <div className="flex gap-3">
                  <button className="bg-white text-gray-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-1.5">
                    Quick View <ChevronRight className="w-4 h-4" />
                  </button>
                  <Link href={`/book/${featured.id}`} onClick={(e) => e.stopPropagation()} className="text-white text-sm font-bold px-5 py-2.5 rounded-xl border border-white/40 hover:bg-white/10 transition-all flex items-center gap-1.5">
                    Book Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
            {weatherMap[featured.region] && (
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-2">
                <span className="text-xl">{weatherMap[featured.region].icon}</span>
                <div>
                  <p className="text-white text-xs font-semibold">{weatherMap[featured.region].condition}</p>
                  <p className="text-white/60 text-[10px]">{weatherMap[featured.region].temp_c}°C</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── ROUTE GRID ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8 pb-20">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 rounded-3xl skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 rounded-3xl border-2 border-dashed border-gray-200 bg-white/60">
            <div className="text-6xl mb-4">🧭</div>
            <p className="text-gray-600 font-bold text-lg mb-1">No routes match your filters</p>
            <p className="text-gray-400 text-sm mb-5">Try adjusting your region or difficulty</p>
            <button
              onClick={() => { setSearchTerm(""); setRegion("All"); setDifficulty("All"); }}
              className="text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${NAVY}, ${GREEN})` }}
            >
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <div className={`grid gap-5 ${view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-2xl"}`}>
            {filtered.map((route, i) => (
              <RouteCard
                key={route.id}
                route={route}
                index={i}
                weather={weatherMap[route.region]}
                onQuickView={() => setQuickView(route)}
                wishlisted={wishlist.includes(route.id)}
                onWishlist={() => toggleWishlist(route.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── QUICK VIEW MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {quickView && (
          <QuickViewModal
            route={quickView}
            weather={weatherMap[quickView.region]}
            onClose={() => setQuickView(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
