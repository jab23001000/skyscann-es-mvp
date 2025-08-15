// app/api/services/car.ts
type Coords = { lat: number; lon: number };

async function geocodeES(q: string): Promise<Coords> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY no configurada");
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${key}&text=${encodeURIComponent(q + ", España")}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("ORS geocode HTTP " + r.status);
  const j = await r.json();
  const f = j?.features?.[0];
  if (!f?.geometry?.coordinates) throw new Error("ORS geocode sin resultados para " + q);
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon };
}

export async function getCarRoute(fromCity: string, toCity: string) {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY no configurada");

  const [o, d] = await Promise.all([geocodeES(fromCity), geocodeES(toCity)]);
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: { "Authorization": key, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ coordinates: [[o.lon, o.lat], [d.lon, d.lat]] })
  });
  if (!res.ok) throw new Error("ORS directions HTTP " + res.status);
  const data = await res.json();

  const summary = data?.features?.[0]?.properties?.summary;
  const sec = summary?.duration;
  const meters = summary?.distance;
  if (!Number.isFinite(sec) || !Number.isFinite(meters)) throw new Error("ORS sin summary (ruta no encontrada)");

  const durationMin = Math.round(sec / 60);
  const km = Math.round(meters / 1000);

  // Modelo de coste simple (puedes parametrizar después)
  const consumoL_100km = 6.5;
  const eurLitro = 1.65;
  const costEUR = +(km * (consumoL_100km / 100) * eurLitro).toFixed(2);

  return { km, durationMin, costEUR };
}
