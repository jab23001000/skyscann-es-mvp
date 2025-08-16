// Asegura que use Node.js (el SDK de OpenAI no funciona en Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ccaaToCapital, findCityAirports } from "../utils/datasets";

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

function pickName(input: string): string | null {
  const txt = (input ?? "").trim();
  if (!txt) return null;

  // 1) Si es una CCAA, devuelve su capital
  const capital = ccaaToCapital(txt); // string | null
  if (capital) return capital;

  // 2) Si es una ciudad conocida con aeropuertos asociados, la damos por válida
  const ap = findCityAirports(txt);
  if (ap && ap.length > 0) return txt;

  // 3) No se pudo normalizar localmente
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { from, to } = await req.json();
    let f = pickName(from);
    let t = pickName(to);

    // Solo usamos GPT si hace falta y hay API key configurada
    if ((!f || !t) && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `
Eres un normalizador de ubicaciones en España. Dado un origen y un destino escritos por un usuario, devuelve JSON estricto:
{"from":"<ciudad o CCAA capitalizada>","to":"<ciudad o CCAA capitalizada>"}
Reglas:
- Si es una Comunidad Autónoma, devuelve su capital (ej: "Navarra" -> "Pamplona", "País Vasco" -> "Vitoria-Gasteiz").
- Si es una ciudad conocida, devuélvela tal cual (respetando acentos).
- No añadas aeropuertos ni países ni provincias, solo el nombre de la ciudad capital o la ciudad original.
- No escribas comentarios, solo JSON.

from="${from}"
to="${to}"
`.trim();

      const r = await client.responses.create({
        model: MODEL,
        input: prompt,
        temperature: 0,
      });

      const text = r.output_text?.trim() || "";
      try {
        const parsed = JSON.parse(text);
        if (!f && parsed?.from) f = parsed.from;
        if (!t && parsed?.to) t = parsed.to;
      } catch {
        // Si GPT respondió algo no-JSON, seguimos con lo que tengamos
      }
    }

    // Fallback final: si no se pudo normalizar, devolvemos los valores originales
    return NextResponse.json({ ok: true, from: f ?? from, to: t ?? to });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown" },
      { status: 500 }
    );
  }
}
