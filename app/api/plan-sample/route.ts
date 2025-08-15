// app/api/plan-sample/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin; // https://skyscann-es-mvp.vercel.app
  const body = { from: "Navarra", to: "Madrid", date: "2025-10-10" };

  const res = await fetch(`${origin}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
