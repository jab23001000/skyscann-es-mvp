import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Detecta tu dominio en Vercel automáticamente
  const origin = new URL(req.url).origin;

  // Ejemplo fijo (puedes cambiarlo)
  const body = { from: "Navarra", to: "Madrid", date: "2025-10-10" };

  const res = await fetch(`${origin}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
