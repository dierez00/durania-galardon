"use client";

import { ProducerDashboardPageContent } from "./ProducerDashboardPage";

export default function ProducerProjectOverviewPage() {
  return (
    <ProducerDashboardPageContent
      title="Resumen del rancho"
      description="Consulta rápida del rancho activo dentro de tu organización."
      showProjectCards={false}
    />
  );
}
