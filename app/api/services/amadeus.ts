// app/api/services/amadeus.ts
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

async function getToken() {
  const cacheKey = "amadeus:token";
  const cached = await redis.get<string>(cacheKey);
  if (cached) return cached;

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!
    })
  });
  if (!res.ok) throw new Error("Amadeus OAuth failed: " + res.status);
  const j = await res.json();
  const token = j.access_token as string;
  const ttl = Math.max(60, Math.floor((j.expires_in ?? 1800) * 0.9)); // 90% del tiempo
  await redis.set(cacheKey, token, { ex: ttl });
  return token;
}

/** Búsqueda simple de vuelos (Amadeus Flight Offers Search v2) */
export async function searchFlights(params: {
  originIATA: string; destIATA: string; date: string; adults?: number;
}) {
  const token = await getToken();

  const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
  url.searchParams.set("originLocationCode", params.originIATA);
  url.searchParams.set("destinationLocationCode", params.destIATA);
  url.searchParams.set("departureDate", params.date);           // YYYY-MM-DD
  url.searchParams.set("adults", String(params.adults ?? 1));
  url.searchParams.set("currencyCode", "EUR");
  url.searchParams.set("nonStop", "false");
  url.searchParams.set("max", "20");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }});
  if (!res.ok) throw new Error("Amadeus error " + res.status);
  return await res.json(); // Devolveremos el JSON crudo; se parsea en /api/plan
}
