"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Booking = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  total_price_usd: number;
};
type Checkin = { id: string; place_id: string; verified: boolean; created_at: string };

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Failed to load booking");
        return;
      }
      setBooking(payload.booking);
      setCheckins(payload.checkins ?? []);
    };
    void load();
  }, [bookingId]);

  const timeline = useMemo(() => {
    if (!booking) return [];
    const items = [
      { at: booking.start_date, label: "Booking start date", type: "booking" as const },
      ...checkins.map((checkin) => ({
        at: checkin.created_at,
        label: `Checkpoint verified (${checkin.place_id.slice(0, 8)}...)`,
        type: "checkin" as const,
      })),
    ];
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [booking, checkins]);

  return (
    <main className="pt-24 pb-12 px-4 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-3xl font-playfair text-himalayan-blue mb-3">Booking Detail</h1>
      {error ? <p className="text-prayer-red">{error}</p> : null}
      {booking ? (
        <>
          <div className="bg-white border rounded-2xl p-5 mb-6">
            <p className="text-sm text-himalayan-blue/60">Booking ID: {booking.id}</p>
            <p className="text-sm text-himalayan-blue/60">Status: {booking.status}</p>
            <p className="text-sm text-himalayan-blue/60">Dates: {booking.start_date}{booking.end_date ? ` - ${booking.end_date}` : ""}</p>
            <p className="text-sm text-himalayan-blue/60">Total: ${booking.total_price_usd}</p>
          </div>
          <section className="space-y-3">
            <h2 className="text-2xl font-playfair">Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-himalayan-blue/60">No timeline items yet.</p>
            ) : (
              timeline.map((item, index) => (
                <div key={`${item.type}-${index}`} className="bg-white border rounded-xl p-4">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-himalayan-blue/50">{new Date(item.at).toLocaleString()}</p>
                </div>
              ))
            )}
          </section>
          <Link
            href={`/trek/${booking.id}`}
            className="inline-block mt-6 px-5 py-3 rounded-xl bg-himalayan-blue text-white font-bold"
          >
            Open active trek view
          </Link>
        </>
      ) : null}
    </main>
  );
}
