// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { makeKey, cacheGet, cacheSet } from "@/app/api/utils/cache";
import { searchFlights } from "@/app/api/services/amadeus";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originIATA, destIATA, date, adults = 1 } = body || {};
    if (!originIATA || !destIATA || !date) {
      return NextResponse.json({ error: "originIATA, destIATA y date son obligatorios" }, { status: 400 });
    }

    const key = makeKey("search", { originIATA, destIATA, date, adults });
    const cached = await cacheGet<any>(key);
    if (cached) return NextResponse.json({ cached: true, ...cached });

    const data = await searchFlights({ originIATA, destIATA, date, adults });
    const payload = { cached: false, data };
    await cacheSet(key, payload, 21600); // 6h

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
