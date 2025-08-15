import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET() {
  await redis.set("hola", "mundo", { ex: 60 }); // TTL 60s
  const value = await redis.get<string>("hola");
  return NextResponse.json({ ok: true, value });
}
