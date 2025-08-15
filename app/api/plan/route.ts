// app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ccaaToCapital } from "@/app/api/utils/ccaa";
import { getCarRoute } from "@/app/api/services/openrouteservice";
import { searchFlights } from "@/app/api/services/amadeus";
import { makeKey, getCache, setCache } from "@/app/api/utils/cache";

type PlanReq = {
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
};

export async function GET() {
  return NextResponse.json({ ok: true, method: "GET", msg: "plan endpoint vivo" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PlanReq;
    if (!body?.from || !body?.to || !body?.date) {
      return NextResponse.json(
        { error: "from, to y date son obligatorios (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Normalizar origen y destino (capital si es CCAA)
    const fromNorm = ccaaToCapital(body.from) ?? body.from;
    const toNorm   = ccaaToCapital(body.to)   ?? body.to;

    // Clave de caché
    const key = makeKey("plan", { fromNorm, toNorm, date: body.date });
    const cached = await getCache(key);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // 1) Baseline coche
    let car;
    try {
      car = await getCarRoute(fromNorm, toNorm); // { km, durationMin, costEUR }
    } catch (e: any) {
      return NextResponse.json(
        { step: "car", error: e?.message ?? String(e), fromNorm, toNorm },
        { status: 500 }
      );
    }
    const maxDuration = car.durationMin * 3;

    // 2) Buscar vuelos (solo como ejemplo MVP)
    let flights: any[] = [];
    try {
      flights = await searchFlights(fromNorm, toNorm, body.date);
    } catch (e: any) {
      console.error("Error en búsqueda de vuelos:", e);
    }

    // 3) Construir respuesta
    const response = {
      origin: fromNorm,
      destination: toNorm,
      date: body.date,
      baseline: { car, ruleMaxDurationMin: maxDuration },
      options: [
        {
          id: "car-baseline",
          mode: "car",
          price: car.costEUR,
          currency: "EUR",
          durationMin: car.durationMin,
          stops: 0,
          origin: fromNorm,
          destination: toNorm,
          score: 1
        },
        ...(flights || [])
      ],
      cached: false
    };

    // Guardar en caché
    await setCache(key, response);

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

