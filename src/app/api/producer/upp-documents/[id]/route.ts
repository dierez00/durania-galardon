import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.write"],
    resource: "producer.documents",
  });
  if (!auth.ok) return auth.response;
  let body: { status?: string };

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON válido.");
  }

  if (!body.status) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status.");
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Verify document exists and belongs to tenant
  const docResult = await supabaseAdmin
    .from("upp_documents")
    .select("upp_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (docResult.error || !docResult.data) {
    return apiError("NOT_FOUND", "Documento no encontrado.", 404);
  }

  // Verify UPP access
  const canAccess = await auth.context.canAccessUpp(docResult.data.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este documento.", 403);
  }

  // Update status
  const updateResult = await supabaseAdmin
    .from("upp_documents")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (updateResult.error) {
    return apiError("UPDATE_FAILED", updateResult.error.message, 500);
  }

  return apiSuccess({ document: updateResult.data });
}
