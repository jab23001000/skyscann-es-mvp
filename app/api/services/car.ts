// app/api/services/car.ts
type Coords = { lat: number; lon: number };

async function geocodeES(q: string): Promise<Coords> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY no configurada");

  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("text", `${q}, España`);
  url.searchParams.set("boundary.country", "ES"); // fuerza España
  url.searchParams.set("size", "1");

  const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`ORS geocode HTTP ${r.status}`);
  const j = await r.json();

  const f = j?.features?.[0];
  if (!f?.geometry?.coordinates) {
    throw new Error(`ORS geocode sin resultados para "${q}"`);
  }
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon };
}

export async function getCarRoute(fromCity: string, toCity: string) {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY no configurada");

  // 1) Geocodifica origen/destino en ES
  const [o, d] = await Promise.all([geocodeES(fromCity), geocodeES(toCity)]);

  // 2) Directions por GET (más estable)
  const dir = new URL("https://api.openrouteservice.org/v2/directions/driving-car");
  dir.searchParams.set("start", `${o.lon},${o.lat}`); // lon,lat
  dir.searchParams.set("end",   `${d.lon},${d.lat}`);

  const res = await fetch(dir.toString(), {
    headers: {
      Authorization: key,
      // 👇 ORS te exige GeoJSON
      Accept: "application/geo+json"
    }
  });
// ...


  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ORS directions HTTP ${res.status} ${txt?.slice(0,120)}`);
  }

  const data = await res.json();
  const summary = data?.features?.[0]?.properties?.summary;

  const sec = summary?.duration;
  const meters = summary?.distance;
  if (!Number.isFinite(sec) || !Number.isFinite(meters)) {
    // Incluimos pistas para depurar
    throw new Error(
      `ORS sin summary (ruta no encontrada). start=${o.lon},${o.lat} end=${d.lon},${d.lat}`
    );
  }

  const durationMin = Math.round(sec / 60);
  const km = Math.round(meters / 1000);

  // Modelo de coste simple
  const consumoL_100km = 6.5;
  const eurLitro = 1.65;
  const costEUR = +(km * (consumoL_100km / 100) * eurLitro).toFixed(2);

  return { km, durationMin, costEUR };
}
