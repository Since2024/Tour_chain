"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Star, Users, DollarSign, BarChart3, AlertCircle } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  total_price_usd: number;
  start_date: string;
  end_date?: string | null;
  route?: { name?: string } | null;
};

// Demo analytics data
const DEMO_MONTHLY = [
  { month: "Nov", revenue: 2400, bookings: 4, rating: 4.8 },
  { month: "Dec", revenue: 1800, bookings: 3, rating: 4.6 },
  { month: "Jan", revenue: 3200, bookings: 5, rating: 4.9 },
  { month: "Feb", revenue: 2900, bookings: 5, rating: 4.7 },
  { month: "Mar", revenue: 4100, bookings: 7, rating: 4.8 },
  { month: "Apr", revenue: 3800, bookings: 6, rating: 5.0 },
];

const DEMO_REVIEWS = [
  { name: "Sarah M.",   rating: 5, text: "Pemba was an incredible guide — knowledgeable, patient, and always safety-first.", route: "EBC Trek",       date: "Apr 28" },
  { name: "James K.",   rating: 5, text: "Best trekking experience of my life. The blockchain check-ins were seamless!",    route: "Annapurna Circuit", date: "Apr 22" },
  { name: "Yuki T.",    rating: 4, text: "Great guide, very professional. Would have liked more cultural context.",         route: "Poon Hill",     date: "Apr 15" },
  { name: "Priya S.",   rating: 5, text: "Felt completely safe throughout. Highly recommend for solo female trekkers.",     route: "Langtang",      date: "Apr 8" },
];

const DEMO_INSIGHTS = [
  { icon: "📈", title: "Peak Season Approaching",   desc: "May–June bookings historically up 40%. Consider raising prices by 10–15%.", type: "opportunity" },
  { icon: "⭐", title: "Rating Streak",              desc: "You've maintained 4.8+ rating for 3 months. Eligible for Featured Guide badge.", type: "achievement" },
  { icon: "💡", title: "Add Langtang Route",         desc: "Langtang Valley searches up 60% this month. Adding this route could boost bookings.", type: "suggestion" },
  { icon: "⚠️", title: "Response Time",              desc: "Average response time is 4h. Aim for <2h to improve conversion rate.", type: "warning" },
];

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-700"
            style={{
              height: `${Math.round((d.revenue / max) * 52)}px`,
              background: "linear-gradient(180deg,#f97316,#fb923c)",
            }}
          />
          <span className="text-[9px] text-gray-400">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-sm ${s <= rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
      ))}
    </div>
  );
}

export default function OperatorDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pipeline" | "analytics" | "reviews" | "insights">("analytics");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/bookings");
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? "Failed to load");
        return;
      }
      setBookings(payload.bookings ?? []);
    };
    void load();
  }, []);

  const grouped = useMemo(() => {
    const statuses = ["pending", "confirmed", "active", "completed"];
    return statuses.map((status) => ({
      status,
      items: bookings.filter((b) => b.status === status),
    }));
  }, [bookings]);

  const totalRevenue = useMemo(
    () => bookings.filter((b) => b.status === "completed").reduce((a, b) => a + Number(b.total_price_usd || 0), 0),
    [bookings],
  );
  const activeCount = useMemo(() => bookings.filter((b) => ["confirmed", "active"].includes(b.status)).length, [bookings]);
  const completedCount = useMemo(() => bookings.filter((b) => b.status === "completed").length, [bookings]);

  const updateStatus = async (bookingId: string, status: string) => {
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setBookings(prev);
  };

  const demoRevenue = DEMO_MONTHLY.reduce((a, m) => a + m.revenue, 0);
  const lastMonth = DEMO_MONTHLY[DEMO_MONTHLY.length - 1];
  const prevMonth = DEMO_MONTHLY[DEMO_MONTHLY.length - 2];
  const revenueChange = Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100);
  const avgRating = (DEMO_MONTHLY.reduce((a, m) => a + m.rating, 0) / DEMO_MONTHLY.length).toFixed(1);

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(160deg,#fafbff 0%,#fff8f2 50%,#f4fff8 100%)" }}>
      <div className="pt-28 px-4 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Guide Dashboard</p>
            <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              Guide <span className="text-orange-500">Analytics</span>
            </h1>
          </div>
          <div className="flex gap-2">
            {(["analytics", "pipeline", "reviews", "insights"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                  tab === t
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-orange-300"
                }`}
              >
                {t === "analytics" ? "📊 Analytics" : t === "pipeline" ? "📋 Pipeline" : t === "reviews" ? "⭐ Reviews" : "💡 Insights"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <DollarSign className="w-5 h-5 text-emerald-500" />, label: "Total Revenue",    value: `$${(totalRevenue || demoRevenue).toLocaleString()}`, sub: "All time", trend: null },
                { icon: <Users className="w-5 h-5 text-blue-500" />,         label: "Active Bookings",  value: activeCount || lastMonth.bookings, sub: "This month", trend: null },
                { icon: <BarChart3 className="w-5 h-5 text-purple-500" />,   label: "Completed Treks",  value: completedCount || DEMO_MONTHLY.reduce((a, m) => a + m.bookings, 0), sub: "All time", trend: null },
                { icon: <Star className="w-5 h-5 text-amber-500" />,         label: "Avg Rating",       value: avgRating, sub: "Last 6 months", trend: null },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    {kpi.icon}
                    <span className="text-xs text-gray-400">{kpi.sub}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900">Monthly Revenue</p>
                  <p className="text-xs text-gray-400">Last 6 months</p>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${revenueChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {revenueChange >= 0 ? "+" : ""}{revenueChange}% vs last month
                </div>
              </div>
              <MiniBarChart data={DEMO_MONTHLY} />
              <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
                {DEMO_MONTHLY.slice(-3).map((m) => (
                  <div key={m.month} className="text-center">
                    <p className="text-sm font-bold text-gray-900">${m.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{m.month} · {m.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Satisfaction */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-bold text-gray-900 mb-4">Customer Satisfaction</p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-amber-500">{avgRating}</p>
                  <StarRating rating={5} />
                  <p className="text-xs text-gray-400 mt-1">{DEMO_REVIEWS.length} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = DEMO_REVIEWS.filter((r) => r.rating === star).length;
                    const pct = Math.round((count / DEMO_REVIEWS.length) * 100);
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{star}★</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
              <p className="font-bold text-gray-900 mb-1">📈 Revenue Forecast</p>
              <p className="text-xs text-gray-500 mb-4">Based on historical trends and current bookings</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { period: "This Month",  amount: 4200, change: +10 },
                  { period: "Next Month",  amount: 5100, change: +21 },
                  { period: "Q3 Estimate", amount: 14800, change: +18 },
                ].map((f) => (
                  <div key={f.period} className="bg-white rounded-xl p-3 text-center border border-orange-100">
                    <p className="text-lg font-bold text-gray-900">${f.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{f.period}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">+{f.change}% projected</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {grouped.map((col) => (
              <div key={col.status} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 capitalize">{col.status}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">{col.items.length}</span>
                </div>
                <div className="space-y-3">
                  {col.items.map((item) => (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-3 hover:border-orange-200 transition-colors">
                      <p className="font-semibold text-sm text-gray-800">{item.route?.name ?? "Route"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.start_date}</p>
                      <p className="text-sm font-bold text-orange-500 mt-1">${item.total_price_usd}</p>
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {["confirmed", "active", "completed"].map((s) => (
                          <button
                            key={s}
                            onClick={() => void updateStatus(item.id, s)}
                            className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-all ${
                              item.status === s
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                            } uppercase`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {col.items.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">Empty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === "reviews" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="text-center">
                <p className="text-5xl font-bold text-amber-500">{avgRating}</p>
                <StarRating rating={5} />
                <p className="text-xs text-gray-400 mt-1">Overall Rating</p>
              </div>
              <div className="h-16 w-px bg-gray-100" />
              <div className="text-sm text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">What trekkers say</p>
                <p>Safety, professionalism, and local knowledge are your top strengths.</p>
              </div>
            </div>
            {DEMO_REVIEWS.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                      {r.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.route} · {r.date}</p>
                    </div>
                  </div>
                  <StarRating rating={r.rating} />
                </div>
                <p className="text-sm text-gray-600 italic">&ldquo;{r.text}&rdquo;</p>
              </div>
            ))}
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {tab === "insights" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">AI-powered recommendations based on your performance data</p>
            {DEMO_INSIGHTS.map((ins, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-5 flex items-start gap-4 ${
                  ins.type === "warning"     ? "bg-amber-50 border-amber-200" :
                  ins.type === "achievement" ? "bg-emerald-50 border-emerald-200" :
                  ins.type === "opportunity" ? "bg-blue-50 border-blue-200" :
                  "bg-white border-gray-100"
                }`}
              >
                <span className="text-3xl shrink-0">{ins.icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{ins.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{ins.desc}</p>
                </div>
                {ins.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 ml-auto" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
