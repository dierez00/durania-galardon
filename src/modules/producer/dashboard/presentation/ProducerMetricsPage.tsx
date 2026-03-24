"use client";

import { ProducerDashboardPageContent } from "./ProducerDashboardPage";

export default function ProducerMetricsPage() {
  return (
    <ProducerDashboardPageContent
      title="Indicadores de la organización"
      description="Vista general de la organización productora con sus indicadores principales."
      showProjectCards={false}
      forceOrganizationScope
    />
  );
}
