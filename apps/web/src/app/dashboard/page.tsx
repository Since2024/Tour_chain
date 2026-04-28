"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  total_price_usd: number;
  route?: { name?: string } | null;
  service?: { title?: string } | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  confirmed: { label: "Confirmed", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   icon: "✅" },
  active:    { label: "Active",    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "🚶" },
  completed: { label: "Completed", color: "text-gray-600",    bg: "bg-gray-50",    border: "border-gray-200",   icon: "🏆" },
  pending:   { label: "Pending",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  icon: "⏳" },
  cancelled: { label: "Cancelled", color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",    icon: "❌" },
};

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const t = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{display}</>;
}

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: React.ReactNode; sub?: string; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl p-6 border transition-all duration-300 cursor-default"
      style={{
        background: hovered ? `${accent}18` : "rgba(255,255,255,0.9)",
        borderColor: hovered ? `${accent}55` : "rgba(0,0,0,0.07)",
        boxShadow: hovered ? `0 8px 32px ${accent}22` : "0 2px 12px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BookingRow({ booking, index }: { booking: Booking; index: number }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_MAP[booking.status] ?? STATUS_MAP.pending;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 90);
    return () => clearTimeout(t);
  }, [index]);

  const title = booking.route?.name ?? booking.service?.title ?? "Route Booking";
  const start = new Date(booking.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const end = booking.end_date ? new Date(booking.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  const progressPct = booking.status === "active" && booking.end_date
    ? Math.min(100, Math.round(((Date.now() - new Date(booking.start_date).getTime()) / (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime())) * 100))
    : null;

  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="rounded-2xl border p-4 transition-all duration-300"
        style={{
          background: hovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.85)",
          borderColor: hovered ? "rgba(249,115,22,0.3)" : "rgba(0,0,0,0.07)",
          boxShadow: hovered ? "0 8px 32px rgba(249,115,22,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
          transform: hovered ? "translateX(4px)" : "translateX(0)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${cfg.bg}`}>
              {cfg.icon}
            </div>
            <div>
              <p className="font-bold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500">{start}{end ? ` → ${end}` : ""}</p>
              {booking.service?.title && booking.route?.name && (
                <p className="text-xs text-gray-400">{booking.service.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-lg">${Number(booking.total_price_usd).toFixed(2)}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <Link
              href={`/booking/${booking.id}`}
              className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-md shadow-orange-500/20"
            >
              View →
            </Link>
          </div>
        </div>
        {progressPct !== null && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Journey in progress</span>
              <span>{progressPct}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TouristDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authState, setAuthState] = useState<"checking" | "authed" | "unauthed">("checking");
  const [filter, setFilter] = useState("all");
  const [greeting, setGreeting] = useState("Welcome back");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/bookings");
      const payload = await res.json();

      // 401 = unauthenticated — redirect to login
      if (res.status === 401) {
        setAuthState("unauthed");
        router.push("/login?next=/dashboard");
        return;
      }

      // Any other non-ok status
      if (!res.ok) {
        setAuthState("authed");
        setLoaded(true);
        return;
      }

      setAuthState("authed");
      setBookings(payload.bookings ?? []);
      setUserEmail(payload.user?.email ?? null);
      setLoaded(true);
    };
    void load();
  }, [router]);

  const totalSpent = useMemo(() => bookings.reduce((a, b) => a + Number(b.total_price_usd || 0), 0), [bookings]);
  const activeCount = useMemo(() => bookings.filter(b => ["pending", "confirmed", "active"].includes(b.status)).length, [bookings]);
  const completedCount = useMemo(() => bookings.filter(b => b.status === "completed").length, [bookings]);

  const filtered = bookings.filter(b => {
    if (filter === "active") return ["confirmed", "active", "pending"].includes(b.status);
    if (filter === "completed") return b.status === "completed";
    return true;
  });

  // Show loading spinner while checking auth
  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #fafbff 0%, #fff8f2 50%, #f4fff8 100%)" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Checking your session…</p>
        </div>
      </div>
    );
  }

  // Redirect is happening
  if (authState === "unauthed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #fafbff 0%, #fff8f2 50%, #f4fff8 100%)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-700 font-semibold text-lg">Please log in to view your dashboard</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Redirecting you to login…</p>
          <Link href="/login?next=/dashboard" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-400 transition-colors">
            Log In Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(160deg, #fafbff 0%, #fff8f2 50%, #f4fff8 100%)" }}>
      <div className="pt-28 px-4 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">{greeting} 👋</p>
            <h1 className="text-5xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              Trekker <span className="text-orange-500">Dashboard</span>
            </h1>
            {userEmail && <p className="text-gray-400 text-sm mt-1">{userEmail}</p>}
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-orange-500/25"
          >
            🧭 Explore Routes
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-5 mb-10">
          <StatCard icon="🧭" label="Active Bookings" value={loaded ? <AnimatedNumber value={activeCount} /> : "—"} sub="In progress or confirmed" accent="#f97316" />
          <StatCard icon="💰" label="Total Spent" value={loaded ? `$${totalSpent.toFixed(2)}` : "—"} sub="Across all bookings" accent="#10b981" />
          <StatCard icon="🏆" label="Completed Treks" value={loaded ? <AnimatedNumber value={completedCount} /> : "—"} sub="NFT proofs eligible" accent="#6366f1" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { href: "/explore", icon: "🗺️", label: "Explore" },
            { href: "/vibe",    icon: "🎖️", label: "My NFTs" },
            { href: "/dao",     icon: "⚖️", label: "DAO" },
            { href: "/nft",     icon: "✨", label: "Mint NFT" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-gray-100 bg-white/80 hover:bg-white hover:border-orange-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold text-gray-600">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Bookings section */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>My Bookings</h2>
          <div className="flex gap-2">
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  filter === f
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-orange-300"
                }`}
              >
                {f === "all" ? "All" : f === "active" ? "🚶 Active" : "🏆 Done"}
              </button>
            ))}
          </div>
        </div>

        {!loaded ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border-2 border-dashed border-gray-200 bg-white/60">
            <div className="text-6xl mb-4">🧗</div>
            <p className="text-gray-500 text-lg font-semibold">No bookings yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Start exploring Nepal trekking routes!</p>
            <Link href="/explore" className="inline-block bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-400 transition-colors">
              Browse Routes →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking, i) => (
              <BookingRow key={booking.id} booking={booking} index={i} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          ⛓️ Powered by Solana · Tourism Chain Nepal · All bookings recorded on-chain
        </p>
      </div>
    </div>
  );
}
