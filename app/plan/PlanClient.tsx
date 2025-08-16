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
  price_total?: number;       // opcional por seguridad
  currency?: string;          // opcional por seguridad
  carriers: string[];
  stops: number;
  duration_total_minutes: number;
  outbound: Segment;
  inbound: Segment | null;
  score?: number;
};
type CarBaseline = {
  distance_km?: number;       // opcionales por seguridad
  duration_minutes?: number;
  cost_eur?: number;
};
type PlanResponse = {
  origin: string;
  destination: string;
  cached?: boolean;
  car?: CarBaseline;          // opcional por seguridad
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
  if (isNaN(d as unknown as number)) return "—";
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
  const carDistance = isFiniteNum(car.distance_km) ? `${Math.round(car.distance_km!)} km` : "—";
  const carDuration = minsToHM(car.duration_minutes);
  const carCost = isFiniteNum(car.cost_eur) ? `~ ${Math.round(car.cost_eur!).toString()} €` : "—";
  const carDurationMinutes = isFiniteNum(car.duration_minutes) ? car.duration_minutes! : undefined;

  return (
    <section className="grid gap-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">
          {from} → {to} {date ? `· ${date}` : ""}
        </h2>
        {typeof data?.cached === "boolean" && (
          <span className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300">
            {data.cached ? "Caché" : "En vivo"}
          </span>
        )}
      </div>

      {loading && <p>Calculando rutas y vuelos…</p>}
      {err && <p className="text-red-400">Error: {err}</p>}

      {(carDistance !== "—" || carDuration !== "—" || carCost !== "—") && (
        <div className="rounded-2xl p-4 bg-neutral-900 shadow">
          <h3 className="text-xl mb-2">Baseline en coche</h3>
          <div className="grid md:grid-cols-3 gap-3 text-neutral-200">
            <div>
              <span className="text-neutral-400">Distancia</span>
              <div className="text-lg">{carDistance}</div>
            </div>
            <div>
              <span className="text-neutral-400">Duración</span>
              <div className="text-lg">{carDuration}</div>
            </div>
            <div>
              <span className="text-neutral-400">Coste estimado</span>
              <div className="text-lg">{carCost}</div>
            </div>
          </div>
          {isFiniteNum(carDurationMinutes) && (
            <p className="text-xs text-neutral-400 mt-2">
              Regla aplicada: descartamos opciones &gt; 3× {minsToHM(carDurationMinutes)}.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3">
        <h3 className="text-xl">Vuelos {flightsSorted.length > 0 ? "(ordenados por score)" : ""}</h3>
        {flightsSorted.length === 0 && !loading && !err && <p>No hay opciones disponibles.</p>}
        <ul className="grid gap-3">
          {flightsSorted.map((f) => {
            const priceText = isFiniteNum(f.price_total) ? Math.round(f.price_total!).toString() : "—";
            const currency = f.currency || "EUR";
            const score = clamp01(f.score ?? 0);
            const scorePct = Math.round(score * 100);

            return (
              <li key={f.id} className="rounded-2xl p-4 bg-neutral-900 shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-medium">
                      {f.carriers?.join(", ") || "—"} ·{" "}
                      {f.stops === 0 ? "Directo" : `${f.stops} escala${f.stops > 1 ? "s" : ""}`}
                    </div>
                    <div className="text-sm text-neutral-300">
                      {fmtDT(f.outbound?.departure)} → {fmtDT(f.outbound?.arrival)} · {minsToHM(f.duration_total_minutes)}
                    </div>
                    {f.inbound && (
                      <div className="text-sm text-neutral-300">
                        Regreso: {fmtDT(f.inbound?.departure)} → {fmtDT(f.inbound?.arrival)} · {minsToHM(f.inbound?.duration_minutes)}
                      </div>
                    )}
                    <div className="mt-2 h-2 rounded bg-neutral-800 overflow-hidden">
                      <div
                        className="h-2 bg-indigo-500"
                        style={{ width: `${scorePct}%` }}
                        title={`score ${score.toFixed(2)}`}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">
                      {priceText} {currency}
                    </div>
                    <div className="text-xs text-neutral-400">score {score.toFixed(2)}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
