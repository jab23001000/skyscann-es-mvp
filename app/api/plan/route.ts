// app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { makeKey, cacheGet, cacheSet } from "@/app/api/utils/cache";
import { ccaaToCapital, findCityAirports } from "@/app/api/utils/datasets";
import { getCarRoute } from "@/app/api/services/car";
import { searchFlights } from "@/app/api/services/amadeus";

type PlanReq = {
  from: string; to: string; date: string;
  prefs?: { hasCar?: boolean; avoidModes?: string[]; maxTransfers?: number; };
};

function parseISODurationToMin(iso: string): number {
  // Soporta formatos tipo PT2H15M, PT45M, PT3H
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || "");
  const h = parseInt(m?.[1] ?? "0", 10) || 0;
  const mm = parseInt(m?.[2] ?? "0", 10) || 0;
  return h * 60 + mm;
}

function rank(o: { price: number; durationMin: number; stops: number; risk?: number }) {
  const priceW = 0.40, durW = 0.35, stopsW = 0.15, riskW = 0.10;
  const p = Math.min(o.price / 200, 1);       // normalización simple
  const d = Math.min(o.durationMin / 300, 1); // 5h top
  const s = Math.min(o.stops / 2, 1);
  const r = Math.min((o.risk ?? 0) / 1, 1);
  return +(1 - (p * priceW + d * durW + s * stopsW + r * riskW)).toFixed(4);
}

function mapAmadeusToOffers(raw: any, maxDurationMin: number) {
  const out: any[] = [];
  for (const off of raw?.data ?? []) {
    const price = parseFloat(off.price?.total ?? "0");
    const itin = off.itineraries?.[0];
    const minutes = parseISODurationToMin(itin?.duration ?? "PT0M");
    const stops = Math.max((itin?.segments?.length ?? 1) - 1, 0);
    if (Number.isFinite(minutes) && minutes > maxDurationMin) continue;

    out.push({
      id: off.id,
      mode: "flight",
      price,
      currency: off.price?.currency ?? "EUR",
      durationMin: minutes,
      stops,
      origin: itin?.segments?.[0]?.departure?.iataCode,
      destination: itin?.segments?.slice(-1)?.[0]?.arrival?.iataCode,
      score: rank({ price, durationMin: minutes, stops })
    });
  }
  return out;
}

export async function GET() {
  return NextResponse.json({ ok: true, method: "GET", msg: "plan endpoint vivo" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PlanReq;
    if (!body?.from || !body?.to || !body?.date) {
      return NextResponse.json({ error: "from, to y date son obligatorios (YYYY-MM-DD)" }, { status: 400 });
    }

    const fromNorm = ccaaToCapital(body.from) ?? body.from;
    const toNorm   = ccaaToCapital(body.to)   ?? body.to;

    const cacheKey = makeKey("plan", { from: fromNorm, to: toNorm, date: body.date, prefs: body.prefs ?? {} });
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return NextResponse.json({ ...cached, cached: true });

    // 1) Baseline coche
    const car = await getCarRoute(fromNorm, toNorm); // { km, durationMin, costEUR }
    const maxDuration = car.durationMin * 3;

    // 2) Aeropuertos cercanos (top 2 por lado, usando tu datasets.ts)
    const fromAP = findCityAirports(fromNorm, 2);
    const toAP   = findCityAirports(toNorm, 2);

    // 3) Vuelos cross-product (Amadeus devuelve JSON crudo, lo mapeamos)
    const promises: Promise<any>[] = [];
    for (const o of fromAP) for (const d of toAP) {
      promises.push(searchFlights({ originIATA: o.iata, destIATA: d.iata, date: body.date, adults: 1 }));
    }
    const settled = await Promise.allSettled(promises);

    let flightOffers: any[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        flightOffers.push(...mapAmadeusToOffers(s.value, maxDuration));
      }
    }

    // 4) Añadimos baseline coche y ordenamos por score
    const options = [
      {
        id: "car-baseline", mode: "car",
        price: car.costEUR, currency: "EUR",
        durationMin: car.durationMin, stops: 0,
        origin: fromNorm, destination: toNorm,
        score: rank({ price: car.costEUR, durationMin: car.durationMin, stops: 0 })
      },
      ...flightOffers
    ].sort((a, b) => b.score - a.score).slice(0, 30);

    const response = {
      origin: fromNorm,
      destination: toNorm,
      date: body.date,
      baseline: { car, ruleMaxDurationMin: maxDuration },
      options
    };

    await cacheSet(cacheKey, response, 21600); // 6h
    return NextResponse.json({ ...response, cached: false });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
