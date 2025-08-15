// app/api/utils/ccaa.ts
import ccaaCaps from "@/data/ccaa-capital.json";

export function ccaaToCapital(name: string): string | null {
  return (ccaaCaps as Record<string, string>)[name] ?? null;
}
