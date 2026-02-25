"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { getAccessToken } from "@/shared/lib/auth-session";

async function downloadReport(format: "excel" | "pdf") {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return;
  }

  const response = await fetch(`/api/admin/reports?format=${format}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return;
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = format === "excel" ? "reporte-oficial.xls" : "reporte-oficial.pdf";
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes Oficiales</h1>
        <p className="text-sm text-muted-foreground">Exportacion en PDF/Excel, reportes SENASICA y epidemiologicos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descargas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => void downloadReport("excel")}>Descargar Excel</Button>
          <Button variant="outline" onClick={() => void downloadReport("pdf")}>Descargar PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
}
