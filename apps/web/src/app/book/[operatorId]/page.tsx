"use client";

import { Calendar, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RouteItem = { id: string; name: string; region: string; difficulty: string; duration_days: number };
type ServiceItem = { id: string; guide_id: string; route_id: string; title: string; price_usd: number };

export default function BookingPage() {
  const params = useParams();
  const routeId = params.operatorId as string;
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const routesRes = await fetch("/api/routes");
      const routesJson = await routesRes.json();
      setRoutes(routesJson.routes ?? []);

      const servicesRes = await fetch(`/api/services?routeId=${routeId}`);
      if (servicesRes.ok) {
        const servicesJson = await servicesRes.json();
        setServices(servicesJson.services ?? []);
        if (servicesJson.services?.length) {
          setSelectedServiceId(servicesJson.services[0].id);
        }
      }
    };
    void load();
  }, [routeId]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === routeId) ?? routes[0],
    [routeId, routes],
  );
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? services[0],
    [selectedServiceId, services],
  );

  const submitBooking = async () => {
    setError(null);
    setMessage(null);
    if (!selectedService || !selectedRoute || !startDate) {
      setError("Select service and date first");
      return;
    }
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guideId: selectedService.guide_id,
        serviceId: selectedService.id,
        routeId: selectedRoute.id,
        startDate,
        endDate: endDate || null,
        totalPriceUsd: Number(selectedService.price_usd),
        milestonesTotal: 3,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : null) ?? "Failed to create booking");
      return;
    }
    setMessage(`Booking created: ${payload.booking.id}`);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="bg-white rounded-2xl border border-himalayan-blue/10 p-6 space-y-6">
        <h1 className="text-3xl font-playfair text-himalayan-blue">
          Book {selectedRoute?.name ?? "Route"}
        </h1>
        <p className="text-sm text-himalayan-blue/60">
          Pick a service and submit booking to Supabase. Escrow transaction wiring comes next.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold block mb-2">Service</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} — ${service.price_usd}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-xl px-4 py-3" />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-xl px-4 py-3" />
          </div>
          <div className="flex items-end">
            <button onClick={submitBooking} className="w-full py-3 rounded-xl bg-himalayan-blue text-white font-bold">
              Confirm booking
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-himalayan-blue/70">
          <Calendar className="w-4 h-4" />
          Price: <strong>${selectedService?.price_usd ?? 0}</strong>
        </div>
        {message ? <p className="text-forest-green font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</p> : null}
        {error ? <p className="text-prayer-red">{error}</p> : null}
      </div>
    </div>
  );
}
