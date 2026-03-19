"use client";

import { ProducerDashboardPageContent } from "./ProducerDashboardPage";

export default function ProducerMetricsPage() {
  return (
    <ProducerDashboardPageContent
      title="Metricas de la organizacion"
      description="Vista agregada del tenant productor con indicadores globales de operacion."
      showProjectCards={false}
      forceOrganizationScope
    />
  );
}
