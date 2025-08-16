"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">Algo no ha ido bien</h2>
      <p className="text-sm text-neutral-400 mb-4">{error?.message || "Error inesperado"}</p>
      <button onClick={reset} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">
        Reintentar
      </button>
    </div>
  );
}
