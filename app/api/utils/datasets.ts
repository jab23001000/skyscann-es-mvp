// app/api/utils/datasets.ts
import airports from "@/data/airports-es.json";
import ccaaCaps from "@/data/ccaa-capital.json";

export type Airport = { iata: string; name: string; city: string; lat: number; lon: number };

export function ccaaToCapital(input: string): string | null {
  const key = Object.keys(ccaaCaps as Record<string,string>).find(k => k.toLowerCase() === input.toLowerCase());
  return key ? (ccaaCaps as any)[key] : null;
}

/**
 * Mapa de ciudades -> aeropuertos preferidos (TOP 1-2)
 * Añade aquí las que vayas necesitando para que el resultado sea “humano”.
 */
const preferredByCity: Record<string, string[]> = {
  // Grandes
  "madrid": ["MAD"],
  "barcelona": ["BCN"],
  "valencia": ["VLC"],
  "sevilla": ["SVQ"],
  "malaga": ["AGP"],
  "bilbao": ["BIO"],
  "palma": ["PMI"],
  "santiago de compostela": ["SCQ"],
  "vitoria": ["BIO"],

  // Pamplona y otras medianas
  "pamplona": ["PNA", "BIO"],
  "zaragoza": ["ZAZ", "PNA"],

  // islas (elige norte/sur como prefieras)
  "santa cruz de tenerife": ["TFN", "TFS"],
  "granadilla de abona": ["TFS", "TFN"],
  "las palmas": ["LPA"],

  // fallback genérico por si el usuario escribe la CCAA como ciudad
  "navarra": ["PNA", "BIO"],
  "pais vasco": ["BIO"],
  "galicia": ["SCQ"],
  "andalucia": ["SVQ", "AGP"],
};

/** Devuelve hasta 'limit' aeropuertos que coinciden por ciudad o por lista preferida. */
export function findCityAirports(city: string, limit = 2): Airport[] {
  const list = airports as Airport[];
  const lower = city.toLowerCase();

  // 1) si hay preferidos definidos para esa ciudad, úsalos
  const pref = preferredByCity[lower];
  if (pref?.length) {
    const found = pref
      .map(code => list.find(a => a.iata === code))
      .filter(Boolean) as Airport[];
    if (found.length) return found.slice(0, limit);
  }

  // 2) si no hay preferidos, intenta por coincidencia de nombre de ciudad
  const byCity = list.filter(a => a.city.toLowerCase() === lower);
  if (byCity.length) return byCity.slice(0, limit);

  // 3) si no hay exact match, usa includes como último recurso
  const includes = list.filter(a => a.city.toLowerCase().includes(lower));
  if (includes.length) return includes.slice(0, limit);

  // 4) fallback durísimo: primeros del dataset (mejor ampliar dataset luego)
  return list.slice(0, limit);
}

