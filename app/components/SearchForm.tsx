"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type InterpretResponse = {
  ok: boolean;
  from?: string;
  to?: string;
  reason?: string;
};

export default function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<string>("");
  const [smart, setSmart] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function normalizeWithGPT(f: string, t: string): Promise<InterpretResponse> {
    try {
      const r = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: f, to: t }),
      });
      if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
      return await r.json();
    } catch (e: any) {
      return { ok: false, reason: e?.message || "Network error" };
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const f = from.trim();
    const t = to.trim();
    if (!f || !t) {
      setErr("Indica origen y destino (ciudad o CCAA).");
      return;
    }
    setLoading(true);
    let fNorm = f, tNorm = t;

    if (smart) {
      const r = await normalizeWithGPT(f, t);
      if (r.ok) {
        fNorm = r.from || f;
        tNorm = r.to || t;
      } else {
        // Fallback silencioso si falla el modo inteligente
        console.warn("interpret failed:", r.reason);
      }
    }

    const params = new URLSearchParams();
    params.set("from", fNorm);
    params.set("to", tNorm);
    if (date) params.set("date", date); // ISO YYYY-MM-DD

    // Navegación por querystring (GET). Si tu /api/plan fuese POST, cambia la página de resultados para que haga POST con estos params.
    router.push(`/plan?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-3xl mx-auto p-4 grid gap-3 rounded-2xl shadow-md bg-neutral-900">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-neutral-300">Desde (ciudad o CCAA)</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Ej. Pamplona o Navarra"
            className="px-3 py-2 rounded-xl bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-neutral-300">Hasta (ciudad o CCAA)</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Ej. Madrid o Comunidad de Madrid"
            className="px-3 py-2 rounded-xl bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 items-end">
        <div className="grid gap-1">
          <label className="text-sm text-neutral-300">Fecha (opcional)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label className="flex items-center gap-2 text-neutral-200">
          <input
            type="checkbox"
            checked={smart}
            onChange={() => setSmart((s) => !s)}
            className="h-4 w-4"
          />
          Búsqueda inteligente (GPT)
        </label>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>
      <p className="text-xs text-neutral-400">
        Regla activa: descartamos opciones con duración &gt; 3× coche. Si pones una CCAA, buscamos desde su capital.
      </p>
    </form>
  );
}
