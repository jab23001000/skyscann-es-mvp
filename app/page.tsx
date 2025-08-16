import React from "react";
import SearchForm from "./components/SearchForm";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Skyscann ES MVP</h1>
        <p className="text-sm text-neutral-400">
          Escribe una <strong>ciudad</strong> o una <strong>Comunidad Autónoma</strong>. 
          Si es CCAA, usamos su capital. Las opciones con duración &gt; 3× coche se descartan.
        </p>
      </header>

      <SearchForm />

      <section className="mt-10 text-sm text-neutral-400">
        <p>Ejemplos: “Navarra → Comunidad de Madrid”, “Pamplona → Madrid”.</p>
      </section>
    </main>
  );
}
