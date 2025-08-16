"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// Tipos (ajusta si tu /api/plan varía)
type Segment = {
  departure: string;
  arrival: string;
  duration_minutes: number;
  segments?: string[];
};
type Flight = {
  id: string;
  price_total?: number;       // <-- opcional por seguridad
  currency?: string;          // <-- opcional por seguridad
  carriers: string[];
  stops: number;
  duration_total_minutes: number;
  outbound: Segment;
  inbound: Segment | null;
  score?: number;
};
type CarBaseline = {
  distance_km?: number;       // <-- opcionales por seguridad
  duration_minutes?: number;
  cost_eur?: number;
};
type PlanResponse = {
  origin: string;
  destination: string;
  cached?: boolean;
  car?: CarBaseline;          // <-- opcional por seguridad
  flights: Flight[];
};

function isFiniteNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function minsToHM(m?: number) {
  if (!isFiniteNum(m)) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
function fmtDT(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const s = d.toString();
  if (s === "Invalid Date") return "—";
  try {
    return d.toLocaleString();
  } catch {
    return "—";
  }
}
function clamp01(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function PlanClient() {
  const params = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const date = params.get("date") || "";

  const [data, setData] = useState<PlanResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function run() {
      if (!from || !to) return;
      setLoading(true);
      setErr(null);
      setData(null);
      const qs = new URLSearchParams();
      qs.set("origin", from);
      qs.set("destination", to);
      if (date) qs.set("date", date);
      try {
        const res = await fetch(`/api/plan?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PlanResponse;
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Error de red");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [from, to, date]);

  const flightsSorted = useMemo(() => {
    if (!data?.flights) return [];
    return [...data.flights].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [data]);

  if (!from || !to) {
    return <p className="text-neutral-400">Introduce origen y destino en la página principal.</p>;
  }

  const car = data?.car ?? {};
  const carDistance = isFiniteNum(car.distance_km) ? Math.round(car.distance_km!).toString() + " km" : "—";
  const carDuration = minsToHM(car.duration_minutes);
  const carCost = isFiniteNum(car.cost_eur) ? `~ ${Math.round(car.cost_eur!).toString()} €` : "—";
  const carDurationMinutes = isFiniteNum(car.duration_minutes) ? car.duration_minutes! : undefined;

  return (
    <section className="grid gap-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">
          {from} → {to} {date ? `· ${date}`
