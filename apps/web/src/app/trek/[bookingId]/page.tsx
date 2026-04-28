"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
const InteractiveMap = dynamic(() => import("@/components/Map"), { ssr: false });

type Checkpoint = {
  id: string;
  sequence_order: number;
  place: { id: string; name: string; latitude: number; longitude: number };
};

type Checkin = { id: string; place_id: string; verified: boolean; created_at: string };

export default function TrekPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Failed to load trek");
        return;
      }
      setCheckpoints(payload.checkpoints ?? []);
      setCheckins(payload.checkins ?? []);
    };
    void load();
  }, [bookingId]);

  const doneSet = useMemo(() => new Set(checkins.filter((c) => c.verified).map((c) => c.place_id)), [checkins]);
  const progressPercent = useMemo(
    () => (checkpoints.length > 0 ? Math.round((doneSet.size / checkpoints.length) * 100) : 0),
    [checkpoints.length, doneSet.size],
  );
  const nextCheckpoint = useMemo(
    () => checkpoints.find((checkpoint) => !doneSet.has(checkpoint.place.id)),
    [checkpoints, doneSet],
  );

  const handleCheckin = async () => {
    if (!nextCheckpoint) return;
    if (!navigator.geolocation) {
      setError("Geolocation is not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          place_id: nextCheckpoint.place.id,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Check-in failed");
        return;
      }
      setCheckins((prev) => [payload.checkin, ...prev]);
      setError(null);
      setInfo("Checkpoint verified");
    });
  };

  const mintProof = async () => {
    const response = await fetch("/api/proof/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        name: "Trek Completion",
        symbol: "TREK",
        uri: "https://example.com/metadata.json",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Proof mint failed");
      return;
    }
    setInfo(`Proof minted: ${payload.proof?.id ?? "ok"}`);
  };

  return (
    <main className="pt-24 pb-12 px-4 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-3xl font-playfair text-himalayan-blue mb-4">Active Trek</h1>
      <p className="text-himalayan-blue/60 mb-6">
        Progress: {doneSet.size}/{checkpoints.length} checkpoints verified.
      </p>
      <div className="w-full h-3 bg-himalayan-blue/10 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-forest-green" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="text-sm text-himalayan-blue/60 mb-6">
        Completion: {progressPercent}% {nextCheckpoint ? `• Next: ${nextCheckpoint.place.name}` : "• All checkpoints done"}
      </p>
      {error ? <p className="text-prayer-red mb-4">{error}</p> : null}
      {info ? <p className="text-forest-green mb-4">{info}</p> : null}
      <div className="mb-6">
        <InteractiveMap
          points={checkpoints.map((checkpoint) => ({
            id: checkpoint.place.id,
            name: checkpoint.place.name,
            lat: Number(checkpoint.place.latitude),
            lng: Number(checkpoint.place.longitude),
            description: doneSet.has(checkpoint.place.id) ? "Checked in" : "Pending checkpoint",
          }))}
          zoom={8}
        />
      </div>
      <div className="space-y-3 mb-6">
        {checkpoints.map((checkpoint) => {
          const done = doneSet.has(checkpoint.place.id);
          return (
            <div key={checkpoint.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{checkpoint.sequence_order}. {checkpoint.place.name}</p>
                <p className="text-sm text-himalayan-blue/50">
                  {Number(checkpoint.place.latitude).toFixed(4)}, {Number(checkpoint.place.longitude).toFixed(4)}
                </p>
              </div>
              <span className={`text-xs font-bold uppercase ${done ? "text-forest-green" : "text-himalayan-blue/40"}`}>
                {done ? "Checked in" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleCheckin}
        disabled={!nextCheckpoint}
        className="px-5 py-3 rounded-xl bg-himalayan-blue text-white font-bold disabled:opacity-50"
      >
        Check in at next checkpoint
      </button>
      <button
        onClick={mintProof}
        disabled={Boolean(nextCheckpoint)}
        className="ml-3 px-5 py-3 rounded-xl bg-trekker-orange text-white font-bold disabled:opacity-50"
      >
        Mint completion proof
      </button>
    </main>
  );
}
