"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";

const InteractiveMap = dynamic(() => import("@/components/Map"), { ssr: false });

type RouteItem = {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  duration_days: number;
  image_url: string | null;
  max_altitude_meters?: number | null;
};
type PlaceItem = { id: string; name: string; latitude: number; longitude: number; description?: string };

const DIFFICULTY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  easy:     { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200",   icon: "🟢" },
  moderate: { color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",       icon: "🟡" },
  hard:     { color: "text-orange-600",  bg: "bg-orange-50 border-orange-200",     icon: "🟠" },
  extreme:  { color: "text-red-600",     bg: "bg-red-50 border-red-200",           icon: "🔴" },
};

const REGIONS = ["All", "Annapurna", "Everest", "Langtang", "Mustang", "Kanchenjunga"];

function RouteCard({ route, index }: { route: RouteItem; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const diff = DIFFICULTY_CONFIG[route.difficulty?.toLowerCase()] ?? DIFFICULTY_CONFIG.moderate;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-2xl overflow-hidden border transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          borderColor: hovered ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.6)",
          boxShadow: hovered
            ? "0 20px 60px rgba(249,115,22,0.15), 0 4px 20px rgba(0,0,0,0.08)"
            : "0 4px 24px rgba(0,0,0,0.06)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden" style={{ height: "200px" }}>
          <Image
            src={route.image_url ?? "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"}
            alt={route.name}
            fill
            className="object-cover transition-transform duration-700"
            style={{ transform: hovered ? "scale(1.07)" : "scale(1)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Altitude badge */}
          {route.max_altitude_meters && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              ⛰️ {(route.max_altitude_meters / 1000).toFixed(1)}k m
            </div>
          )}
          {/* Difficulty badge */}
          <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full border ${diff.bg} ${diff.color} flex items-center gap-1`}>
            {diff.icon} {route.difficulty}
          </div>
          {/* Bottom overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white text-xl font-bold drop-shadow-lg">{route.name}</h3>
            <p className="text-white/70 text-xs flex items-center gap-2 mt-0.5">
              <span>📍 {route.region}</span>
              <span>•</span>
              <span>🗓 {route.duration_days} days</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            <span className="text-gray-500 text-xs">Verified route</span>
          </div>
          <Link
            href={`/book/${route.id}`}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg shadow-orange-500/25"
          >
            Book Now →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const [routesRes, placesRes] = await Promise.all([
        fetch("/api/routes"),
        fetch("/api/places").catch(() => null),
      ]);
      const routesJson = await routesRes.json();
      setRoutes((routesJson.routes ?? []) as RouteItem[]);
      if (placesRes?.ok) {
        const placesJson = await placesRes.json();
        setPlaces((placesJson.places ?? []) as PlaceItem[]);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return routes.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.region.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRegion = region === "All" || r.region.toLowerCase().includes(region.toLowerCase());
      const matchDiff = difficulty === "All" || r.difficulty?.toLowerCase() === difficulty.toLowerCase();
      return matchSearch && matchRegion && matchDiff;
    });
  }, [routes, searchTerm, region, difficulty]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fef9f0 50%, #f0fff4 100%)" }}>
      {/* Hero header */}
      <div className="pt-28 pb-8 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 text-sm text-orange-600 font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            {routes.length} Verified Routes Available
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-3" style={{ fontFamily: "Georgia, serif" }}>
            Discover Your <span className="text-orange-500 italic">Next Route</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Explore blockchain-verified Nepal treks. Every route is immutably recorded on Solana.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search routes, regions..."
            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-white shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 text-gray-800 text-lg"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl">
              ✕
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex flex-wrap gap-2">
            {/* Region filters */}
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  region === r
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 text-gray-600 hover:bg-white hover:text-orange-500 border border-gray-200"
                }`}
              >
                {r}
              </button>
            ))}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white/80 text-gray-600 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
            >
              {["All", "Easy", "Moderate", "Hard", "Extreme"].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowMap(m => !m)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${showMap ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-200"}`}>
              🗺 Map
            </button>
            <button onClick={() => setView("grid")} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${view === "grid" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"}`}>
              ⊞
            </button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${view === "list" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"}`}>
              ☰
            </button>
          </div>
        </div>

        <div className="flex gap-3 text-sm text-gray-500 mb-6">
          <span>{filtered.length} routes found</span>
          {searchTerm && <span>· matching &quot;<strong className="text-orange-500">{searchTerm}</strong>&quot;</span>}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-7xl mx-auto pb-16">
        <div className={`grid gap-8 ${showMap ? "lg:grid-cols-3" : "grid-cols-1"}`}>
          {/* Routes */}
          <div className={showMap ? "lg:col-span-2" : "col-span-1"}>
            {loading ? (
              <div className={`grid gap-6 ${view === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-72 rounded-2xl bg-white/60 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 rounded-3xl border-2 border-dashed border-gray-200 bg-white/60">
                <div className="text-6xl mb-4">🧭</div>
                <p className="text-gray-500 font-semibold text-lg">No routes match your filters</p>
                <button onClick={() => { setSearchTerm(""); setRegion("All"); setDifficulty("All"); }} className="mt-4 text-orange-500 font-semibold hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className={`grid gap-6 ${view === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {filtered.map((route, i) => (
                  <RouteCard key={route.id} route={route} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          {showMap && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl overflow-hidden shadow-2xl border border-white">
                <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <span className="font-semibold text-gray-700 text-sm">🗺️ Nepal Route Map</span>
                  <span className="text-xs text-gray-400">{places.length} locations</span>
                </div>
                <InteractiveMap
                  points={places.map((place) => ({
                    id: place.id,
                    name: place.name,
                    lat: Number(place.latitude),
                    lng: Number(place.longitude),
                    description: place.description,
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
