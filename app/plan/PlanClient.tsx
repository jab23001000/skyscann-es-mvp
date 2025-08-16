"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// Ajusta estos tipos si tu /api/plan devuelve un shape distinto
type Segment = { departure: string; arrival: string; duration_minutes: number; segments?: string[] };
type Flight = {
  id: string;
  price_total: number;
  currency: string;
  carriers: string[];
  stops: number;
  duration_total_minutes: number;
  outbound: Segment;
  inbound: Segment | null;
  score?: number;
};
type CarBaseline = { distance_km: number; duration_minutes: number; cost_eur: number };
type PlanResponse = {
  origin: string;
  destination: string;
  cached?: boolean;
  car: CarBaseline;
  flights: Flight[];
};

function minsToHM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
function fmtDT(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
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

  return (
    <section className="grid gap-6">
      {loading && <p>Calculando rutas y vuelos…</p>}
      {err && <p className="text-red-400">Error: {err}</p>}

      {data && (
        <>
          <div className="rounded-2xl p-4 bg-neutral-900 shadow">
            <h2 className="text-xl mb-2">Baseline en coche</h2>
            <div className="grid md:grid-cols-3 gap-3 text-neutral-200">
              <div>
                <span className="text-neutral-400">Distancia</span>
                <div className="text-lg">{data.car.distance_km.toFixed(0)} km</div>
              </div>
              <div>
                <span className="text-neutral-400">Duración</span>
                <div className="text-lg">{minsToHM(data.car.duration_minutes)}</div>
              </div>
              <div>
                <span className="text-neutral-400">Coste estimado</span>
                <div className="text-lg">~ {data.car.cost_eur.toFixed(0)} €</div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Regla aplicada: descartamos opciones &gt; 3× {minsToHM(data.car.duration_minutes)}.
            </p>
          </div>

          <div className="grid gap-3">
            <h2 className="text-xl">Vuelos (ordenados por score)</h2>
            {flightsSorted.length === 0 && <p>No hay opciones dentro del límite 3× coche.</p>}
            <ul className="grid gap-3">
              {flightsSorted.map((f) => (
                <li key={f.id} className="rounded-2xl p-4 bg-neutral-900 shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-medium">
                        {f.carriers.join(", ")} · {f.stops === 0 ? "Directo" : `${f.stops} escala${f.stops > 1 ? "s" : ""}`}
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
                          style={{ width: `${Math.min(100, Math.max(0, Math.round((f.score ?? 0) * 100)))}%` }}
                          title={`score ${(f.score ?? 0).toFixed(2)}`}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">
                        {f.price_total.toFixed(0)} {f.currency}
                      </div>
                      <div className="text-xs text-neutral-400">score {(f.score ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
