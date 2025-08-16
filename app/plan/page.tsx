import React, { Suspense } from "react";
import PlanClient from "./PlanClient";

export const dynamic = "force-dynamic"; // evita prerender estático que rompe con hooks de cliente

export default function Page() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Resultados</h1>
      <Suspense fallback={<p>Preparando búsqueda…</p>}>
        <PlanClient />
      </Suspense>
    </main>
  );
}
