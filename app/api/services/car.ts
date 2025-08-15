// app/api/services/car.ts
type Coords = { lat: number; lon: number };

async function geocodeES(q: string): Promise<Coords> {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${process.env.ORS_API_KEY}&text=${encodeURIComponent(q + ', España')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("ORS geocode error " + r.status);
  const j = await r.json();
  const f = j.features?.[0];
  if (!f) throw new Error("No geocode result for " + q);
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon };
}

export async function getCarRoute(fromCity: string, toCity: string) {
  const [o, d] = await Promise.all([geocodeES(fromCity), geocodeES(toCity)]);
  const api = "https://api.openrouteservice.org/v2/directions/driving-car";
  const headers = { "Authorization": process.env.ORS_API_KEY!, "Content-Type": "application/json" };
  const body = { coordinates: [[o.lon, o.lat], [d.lon, d.lat]] };

  const res = await fetch(api, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("ORS directions error " + res.status);
  const data = await res.json();

  const sec = data?.features?.[0]?.properties?.summary?.duration ?? 0;
  const meters = data?.features?.[0]?.properties?.summary?.distance ?? 0;
  const durationMin = Math.round(sec / 60);
  const km = Math.round(meters / 1000);

  // Coste combustible (puedes ajustar luego desde la UI)
  const consumo = 6.5; // l/100km
  const eurLitro = 1.65;
  const costEUR = +(km * (consumo / 100) * eurLitro).toFixed(2);

  return { km, durationMin, costEUR };
}
