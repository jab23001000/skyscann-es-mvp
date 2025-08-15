// app/api/services/openrouteservice.ts
export async function getCarRoute(from: string, to: string) {
  console.log(`Simulando ruta en coche de ${from} a ${to}`);
  
  // Datos simulados para MVP
  return {
    km: 400,
    durationMin: 240, // 4 horas
    costEUR: 50
  };
}
