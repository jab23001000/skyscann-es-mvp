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

function rank(o: { price: number; durationMin: number; stops: number; risk?: number }) {
  const priceW=0.40, durW=0.35, stopsW=0.15, riskW=0.10;
  const p = Math.min(o.price/200, 1);
  const d = Math.min(o.durationMin/300, 1);
  const s = Math.min(o.stops/2, 1);
  const r = Math.min((o.risk ?? 0)/1, 1);
  return +(1 - (p*priceW + d*durW + s*stopsW + r*riskW)).toFixed(4);
}

// Handler opcional de salud (GET)
export async function GET() {
  return NextResponse.json({ ok: true, method: "GET", msg: "plan endpoint vivo" });
}

// Handler principal (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PlanReq;
    if (!body?.from || !body?.to || !body?.date) {
      return NextResponse.json({ error: "from, to y date son obligatorios (YYYY-MM-DD)" }, { status: 400 });
    }

    // Normalizar origen y destino (capital si es CCAA)
    const fromNorm = ccaaToCapital(body.from) ?? body.from;
    const toNorm   = ccaaToCapital(body.to)   ?? body.to;

    // 1) Baseline coche
    let car;
    try {
      car = await getCarRoute(fromNorm, toNorm); // {km, durationMin, costEUR}
    } catch (e: any) {
      return NextResponse.json({ step: "car", error: e?.message ?? String(e), fromNorm, toNorm }, { status: 500 });
    }
    const maxDuration = car.durationMin * 3;

    // ... resto del código ...




    
    const fromNorm = ccaaToCapital(body.from) ?? body.from;
    const toNorm   = ccaaToCapital(body.to)   ?? body.to;

    const key = makeKey("plan", { ...body, fromNorm, toNorm });
    const cached = await cacheGet<any>(key);
    if (cached) return NextResponse.json({ ...cached, cached: true });

    // 1) Baseline coche
    const car = await getCarRoute(fromNorm, toNorm); // {km, durationMin, costEUR}
    const maxDuration = car.durationMin * 3;

    // 2) Aeropuertos cercanos (MVP)
    const fromAP = findCityAirports(fromNorm, 2);
    const toAP   = findCityAirports(toNorm, 2);

    // 3) Vuelos cross-product
    const queries: Promise<any>[] = [];
    for (const o of fromAP) for (const d of toAP) {
      queries.push(searchFlights({ originIATA: o.iata, destIATA: d.iata, date: body.date, adults: 1 }));
    }

    const results = await Promise.allSettled(queries);
    const offers: any[] = [];
    for (const r of results) if (r.status === "fulfilled") {
      const data = (r as any).value;
      for (const off of data.data ?? []) {
        const price = parseFloat(off.price.total);
        const itin = off.itineraries?.[0];
        const durISO = itin?.duration ?? "PT0M";
        const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(durISO);
        const minutes = (parseInt(m?.[1] ?? "0")*60) + parseInt(m?.[2] ?? "0");
        const stops = (itin?.segments?.length ?? 1) - 1;

        if (Number.isFinite(minutes) && minutes > maxDuration) continue;

        offers.push({
          id: off.id, mode: "flight",
          price, currency: off.price.currency,
          durationMin: minutes, stops,
          origin: off.itineraries?.[0]?.segments?.[0]?.departure?.iataCode,
          destination: off.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode,
          score: rank({ price, durationMin: minutes, stops })
        });
      }
    }

    // 4) Añadir baseline coche
    offers.push({
      id: "car-baseline", mode: "car",
      price: car.costEUR, currency: "EUR",
      durationMin: car.durationMin, stops: 0,
      origin: fromNorm, destination: toNorm,
      score: rank({ price: car.costEUR, durationMin: car.durationMin, stops: 0 })
    });

    // 5) Orden y respuesta
    offers.sort((a,b) => b.score - a.score);
    const response = {
      origin: fromNorm, destination: toNorm, date: body.date,
      baseline: { car, ruleMaxDurationMin: maxDuration },
      options: offers.slice(0, 30)
    };

    await cacheSet(key, response, 21600); // 6h
    return NextResponse.json({ ...response, cached: false });

  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
