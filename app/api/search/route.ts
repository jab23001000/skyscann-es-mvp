// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { makeKey, cacheGet, cacheSet } from "@/app/api/utils/cache";
import { searchFlights } from "@/app/api/services/amadeus";

/**
 * Espera body JSON:
 * {
 *   "originIATA": "MAD",
 *   "destIATA": "BCN",
 *   "date": "2025-10-10",
 *   "adults": 1
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.originIATA || !body?.destIATA || !body?.date) {
      return NextResponse.json({ error: "originIATA, destIATA y date son obligatorios" }, { status: 400 });
    }

    const key = makeKey("search", body);
    const cached = await cacheGet<any>(key);
    if (cached) return NextResponse.json({ cached: true, ...cached });

    const data = await searchFlights(body);
    const payload = { cached: false, data };

    await cacheSet(key, payload, 21600); // 6h
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
