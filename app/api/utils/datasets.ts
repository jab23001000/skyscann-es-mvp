// app/api/utils/datasets.ts
import airports from "@/data/airports-es.json";
import ccaaCaps from "@/data/ccaa-capital.json";

export type Airport = { iata: string; name: string; city: string; lat: number; lon: number };

export function ccaaToCapital(input: string): string | null {
  const key = Object.keys(ccaaCaps).find(k => k.toLowerCase() === input.toLowerCase());
  return key ? (ccaaCaps as any)[key] : null;
}

/** Devuelve hasta 'limit' aeropuertos que coinciden por ciudad (MVP simple). */
export function findCityAirports(city: string, limit = 2): Airport[] {
  const cityLower = city.toLowerCase();
  const inCity = (airports as Airport[]).filter(a => a.city.toLowerCase().includes(cityLower));
  if (inCity.length) return inCity.slice(0, limit);
  // Fallback básico: primeros aeropuertos del dataset (mejora más adelante con distancia real)
  return (airports as Airport[]).slice(0, limit);
}
