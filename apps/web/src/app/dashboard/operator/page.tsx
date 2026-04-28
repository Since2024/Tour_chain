"use client";

import { useEffect, useMemo, useState } from "react";

type Booking = {
  id: string;
  status: string;
  total_price_usd: number;
  start_date: string;
  route?: { name?: string } | null;
};

export default function OperatorDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/bookings");
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Failed to load");
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
      items: bookings.filter((booking) => booking.status === status),
    }));
  }, [bookings]);

  const updateStatus = async (bookingId: string, status: string) => {
    const previous = bookings;
    setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)));
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setBookings(previous);
      setError(payload?.error?.message ?? "Failed to update status");
      return;
    }
    setBookings((prev) =>
      prev.map((booking) => (booking.id === bookingId ? { ...booking, status: payload.booking.status } : booking)),
    );
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <header className="mb-12">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-himalayan-blue/40 mb-2">Guide Dashboard</h2>
          <h1 className="text-5xl font-playfair text-himalayan-blue">Bookings Pipeline</h1>
        </div>
      </header>
      {error ? <p className="text-prayer-red mb-4">{error}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {grouped.map((column) => (
          <div key={column.status} className="bg-white border rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-himalayan-blue/40 mb-4">
              {column.status}
            </h3>
            <div className="space-y-3">
              {column.items.map((item) => (
                <div key={item.id} className="border rounded-xl p-3">
                  <p className="font-semibold">{item.route?.name ?? "Route"}</p>
                  <p className="text-xs text-himalayan-blue/50">{item.start_date}</p>
                  <p className="text-xs font-bold mt-1">${item.total_price_usd}</p>
                  <div className="mt-2 flex gap-2">
                    {["confirmed", "active", "completed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(item.id, status)}
                        className="text-[10px] px-2 py-1 rounded bg-himalayan-blue/10 hover:bg-himalayan-blue/20 uppercase"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {column.items.length === 0 ? (
                <p className="text-xs text-himalayan-blue/40">No bookings</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
