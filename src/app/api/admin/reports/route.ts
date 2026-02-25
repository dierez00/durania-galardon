import { apiError } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { buildExcelXml, buildSimplePdf } from "@/server/reports";
import { logAuditEvent } from "@/server/audit";
import type { ReportFormat } from "@/shared/lib/auth";

function resolveReportFormat(value: string | null): ReportFormat {
  return value === "pdf" ? "pdf" : "excel";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.reports.export"],
    resource: "admin.reports",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const format = resolveReportFormat(url.searchParams.get("format"));

  const supabaseAdmin = getSupabaseAdminClient();
  const dataResult = await supabaseAdmin
    .from("export_requests")
    .select("id,status,monthly_bucket,compliance_60_rule,tb_br_validated,blue_tag_assigned,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (dataResult.error) {
    return apiError("ADMIN_REPORTS_QUERY_FAILED", dataResult.error.message, 500);
  }

  const rows = (dataResult.data ?? []).map((row) => [
    row.id,
    row.status,
    row.monthly_bucket ?? "",
    row.compliance_60_rule ? "SI" : "NO",
    row.tb_br_validated ? "SI" : "NO",
    row.blue_tag_assigned ? "SI" : "NO",
    row.created_at,
  ]);

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "export",
    resource: "admin.reports",
    payload: {
      format,
      rows: rows.length,
    },
  });

  if (format === "excel") {
    const xml = buildExcelXml(
      [
        "ID",
        "Estado",
        "Mes",
        "Regla 60",
        "TB/BR",
        "Arete Azul",
        "Creado",
      ],
      rows
    );

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename=reportes-oficiales-${Date.now()}.xls`,
      },
    });
  }

  const pdfBuffer = buildSimplePdf("Reporte Oficial DURANIA", [
    `Tenant: ${auth.context.user.tenantSlug}`,
    `Generado por: ${auth.context.user.email}`,
    `Fecha: ${new Date().toISOString()}`,
    `Registros exportados: ${rows.length}`,
    "",
    "Campos: ID, Estado, Mes, Regla 60, TB/BR, Arete Azul, Creado",
  ]);
  const pdfArrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength
  ) as ArrayBuffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  return new Response(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=reportes-oficiales-${Date.now()}.pdf`,
    },
  });
}
