"use client";

import { ProducerDashboardPageContent } from "./ProducerDashboardPage";

export default function ProducerProjectOverviewPage() {
  return (
    <ProducerDashboardPageContent
      title="Overview del proyecto"
      description="Resumen operativo del rancho activo dentro del tenant."
      showProjectCards={false}
    />
  );
}
