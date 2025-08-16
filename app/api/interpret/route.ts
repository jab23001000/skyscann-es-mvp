import { NextRequest, NextResponse } from "next/server";
import { findCityAirports, normalizeByCCAA } from "../utils/datasets"; // ajusta la ruta real
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini"; // ajusta si usas otro

function pickName(input: string): string | null {
  const txt = (input || "").trim();
  if (!txt) return null;
  // 1) CCAA → capital
  const byCcaa = normalizeByCCAA(txt); // devuelve string | null
  if (byCcaa) return byCcaa;

  // 2) Ciudad conocida → la devolvemos tal cual si hay aeropuertos asociados
  const ap = findCityAirports(txt);
  if (ap && ap.length > 0) return txt;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { from, to } = await req.json();
    let f = pickName(from);
    let t = pickName(to);

    if (!f || !t) {
      // Fallback GPT
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
        if (!f) f = parsed.from;
        if (!t) t = parsed.to;
      } catch {
        // Si GPT falla, mantenemos lo que haya
      }
    }

    return NextResponse.json({ ok: true, from: f ?? from, to: t ?? to });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
