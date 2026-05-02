"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, CheckCircle2 } from "lucide-react";
import { haversineMeters } from "@/lib/geo";
import { WeatherWidget } from "@/components/WeatherWidget";
import { SOSButton } from "@/components/SOSButton";
import { CheckinButton } from "@/components/CheckinButton";
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
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(
          payload?.error?.message ??
            (typeof payload?.error === "string" ? payload.error : null) ??
            "Failed to load trek",
        );
        return;
      }
      setCheckpoints(payload.checkpoints ?? []);
      setCheckins(payload.checkins ?? []);
    };
    void load();
  }, [bookingId]);

  const doneSet = useMemo(
    () => new Set(checkins.filter((c) => c.verified).map((c) => c.place_id)),
    [checkins],
  );
  const progressPercent = useMemo(
    () => (checkpoints.length > 0 ? Math.round((doneSet.size / checkpoints.length) * 100) : 0),
    [checkpoints.length, doneSet.size],
  );
  const nextCheckpoint = useMemo(
    () => checkpoints.find((cp) => !doneSet.has(cp.place.id)),
    [checkpoints, doneSet],
  );
  const distanceToNext = useMemo(() => {
    if (!userPos || !nextCheckpoint) return null;
    return haversineMeters(
      userPos.lat, userPos.lng,
      Number(nextCheckpoint.place.latitude), Number(nextCheckpoint.place.longitude)
    );
  }, [userPos, nextCheckpoint]);
  const nearNextCheckpoint = distanceToNext !== null && distanceToNext <= 500;

  const handleCheckin = async () => {
    if (!nextCheckpoint || !userPos) return;
    setError(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        place_id: nextCheckpoint.place.id,
        lat: userPos.lat,
        lng: userPos.lng,
      }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Check-in failed");
      return;
    }
    setCheckins((prev) => [payload.checkin, ...prev]);
    setInfo("Checkpoint verified");
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
  };

  return (
    <main className="pt-24 pb-12 px-4 max-w-4xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-playfair text-himalayan-blue mb-1">Active Trek</h1>
        <p className="text-himalayan-blue/60 text-sm">
          {doneSet.size}/{checkpoints.length} checkpoints verified
          {nextCheckpoint ? ` · Next: ${nextCheckpoint.place.name}` : " · All done!"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-himalayan-blue/50 mb-1.5">
          <span>Trek Progress</span>
          <span className="font-bold text-himalayan-blue">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-himalayan-blue/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg,#10b981,#059669)",
            }}
          />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-semibold">
          {info}
        </div>
      )}

      {/* Weather */}
      <div className="mb-6">
        <WeatherWidget compact />
      </div>

      {/* SOS */}
      <div className="mb-6">
        <SOSButton bookingId={bookingId} trekName="Active Trek" />
      </div>
      {/* Map */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-himalayan-blue/10">
        <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-himalayan-blue flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> Route Map
          </span>
          <span className="text-xs text-gray-400">{checkpoints.length} checkpoints</span>
        </div>
        <InteractiveMap
          points={checkpoints.map((cp) => ({
            id: cp.place.id,
            name: cp.place.name,
            lat: Number(cp.place.latitude),
            lng: Number(cp.place.longitude),
            description: doneSet.has(cp.place.id) ? "✅ Checked in" : "⏳ Pending",
          }))}
          zoom={8}
        />
      </div>

      {/* Checkpoints list */}
      <div className="space-y-3 mb-6">
        {checkpoints.map((cp) => {
          const done = doneSet.has(cp.place.id);
          const isNext = nextCheckpoint?.id === cp.id;
          return (
            <div
              key={cp.id}
              className={`rounded-2xl border p-4 transition-all ${
                done
                  ? "bg-emerald-50 border-emerald-200"
                  : isNext
                  ? "bg-orange-50 border-orange-200 shadow-md"
                  : "bg-white border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : isNext
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : cp.sequence_order}
                  </div>
                  <div>
                    <p className="font-semibold text-himalayan-blue">{cp.place.name}</p>
                    <p className="text-xs text-himalayan-blue/50">
                      {Number(cp.place.latitude).toFixed(4)}, {Number(cp.place.longitude).toFixed(4)}
                    </p>
                    {isNext && (
                      <p className="text-xs text-orange-600 font-semibold mt-0.5">← Next checkpoint</p>
                    )}
                  </div>
                </div>
                {done ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    ✅ Done
                  </span>
                ) : isNext ? (
                  <CheckinButton
                    bookingId={bookingId}
                    placeId={cp.place.id}
                    placeName={cp.place.name}
                    onSuccess={(checkin: Checkin) => {
                      setCheckins((prev) => [{ ...checkin, place_id: cp.place.id }, ...prev]);
                      setInfo(`✅ Checked in at ${cp.place.name}`);
                    }}
                  />
                ) : (
                  <span className="text-xs text-gray-400">Pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        {nextCheckpoint && !userPos && (
          <p className="text-sm text-himalayan-blue/60">Waiting for GPS location…</p>
        )}
        {nextCheckpoint && userPos && !nearNextCheckpoint && distanceToNext !== null && (
          <p className="text-sm text-amber-600">
            {Math.round(distanceToNext)}m away from {nextCheckpoint.place.name} (need ≤500m)
          </p>
        )}
        <button
          onClick={handleCheckin}
          disabled={!nextCheckpoint || !nearNextCheckpoint}
          className="px-5 py-3 rounded-xl bg-himalayan-blue text-white font-bold disabled:opacity-50"
        >
          Check in at next checkpoint
        </button>
      </div>
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
