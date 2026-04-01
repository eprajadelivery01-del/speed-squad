import { DriverLayout } from "@/components/driver/DriverLayout";

export default function DriverHomePage() {
  return (
    <DriverLayout title="Início">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <h2 className="text-lg font-bold text-foreground mb-2">Bem-vindo, Entregador!</h2>
        <p className="text-muted-foreground">Suas entregas aparecerão aqui.</p>
      </div>
    </DriverLayout>
  );
}
