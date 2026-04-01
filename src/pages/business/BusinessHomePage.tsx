import { BusinessLayout } from "@/components/business/BusinessLayout";

export default function BusinessHomePage() {
  return (
    <BusinessLayout title="Início">
      <div className="rounded-2xl bg-card p-8 shadow-card text-center">
        <h2 className="text-lg font-bold text-foreground mb-2">Bem-vindo!</h2>
        <p className="text-muted-foreground">Gerencie suas entregas aqui.</p>
      </div>
    </BusinessLayout>
  );
}
