// app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCarRoute } from "@/app/api/services/openrouteservice";
import { searchFlights } from "@/app/api/services/amadeus";
import { makeKey, cacheGet, cacheSet } from "@/app/api/utils/cache";
import { ccaaToCapital } from "@/app/api/utils/datasets"; // dataset con capitales de CCAA

type PlanReq = {
  from: string;
  to: string;
  date: string; // formato YYYY-MM-DD
};

export async function GET() {
  return NextResponse.json({ ok: true, method: "GET", msg: "plan endpoint vivo" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PlanReq;
    if (!body?.from || !body?.to || !body?.date) {
      return NextResponse.json({ error: "from, to y date son obligatorios (YYYY-MM-DD)" }, { status: 400 });
    }

    // Normalizar: si es CCAA → capital
    const fromNorm = ccaaToCapital(body.from) ?? body.from;
    const toNorm   = ccaaToCapital(body.to)   ?? body.to;

    const key = makeKey("plan", { from: fromNorm, to: toNorm, date: body.date });
    const cached = await getCache(key);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // 1) Baseline coche
    const car = await getCarRoute(fromNorm, toNorm); // { km, durationMin, costEUR }
    const maxDuration = car.durationMin * 3; // regla: máximo 3x duración coche

    // 2) Vuelos (MVP: solo modo flight)
const flights = await searchFlights({
  originIATA: fromNorm,
  destIATA: toNorm,
  date: body.date
});

    // 3) Filtrar por tiempo máximo
    const filteredFlights = flights.filter(f => f.durationMin <= maxDuration);

    const result = {
      origin: fromNorm,
      destination: toNorm,
      date: body.date,
      baseline: { car, ruleMaxDurationMin: maxDuration },
      options: [
        { id: "car-baseline", mode: "car", price: car.costEUR, currency: "EUR", durationMin: car.durationMin, stops: 0, origin: fromNorm, destination: toNorm, score: 1 },
        ...filteredFlights
      ],
      cached: false
    };

    await setCache(key, result);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
