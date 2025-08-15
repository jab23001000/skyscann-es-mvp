// app/api/services/car.ts
type Coords = { lat: number; lon: number };

async function geocodeES(q: string): Promise<Coords> {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${process.env.ORS_API_KEY}&text=${encodeURIComponent(q + ', España')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("ORS geocode HTTP " + r.status);
  const j = await r.json();
  const f = j?.features?.[0];
  if (!f?.geometry?.coordinates) throw new Error("ORS geocode sin resultados para " + q);
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon };
}

export async function getCarRoute(fromCity: string, toCity: string) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY no configurada");

  const [o, d] = await Promise.all([geocodeES(fromCity), geocodeES(toCity)]);
  const api = "https://api.openrouteservice.org/v2/directions/driving-car";
  const headers = { "Authorization": apiKey, "Content-Type": "application/json", "Accept": "application/json" };
  const body = { coordinates: [[o.lon, o.lat], [d.lon, d.lat]] };

  const res = await fetch(api, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("ORS directions HTTP " + res.status);
  const data = await res.json();

  const summary = data?.features?.[0]?.properties?.summary;
  const sec = summary?.duration;
  const meters = summary?.distance;

  if (!Number.isFinite(sec) || !Number.isFinite(meters)) {
    // Si ORS responde 200 pero sin summary, forzamos error para no devolver 0
    throw new Error("ORS sin summary (ruta no encontrada)");
  }

  const durationMin = Math.round(sec / 60);
  const km = Math.round(meters / 1000);

  // Coste combustible (MVP)
  const consumo = 6.5; // l/100km
  const eurLitro = 1.65;
  const costEUR = +(km * (consumo / 100) * eurLitro).toFixed(2);

  return { km, durationMin, costEUR };
}
