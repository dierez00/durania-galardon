import { NextRequest } from "next/server";
import { requireAuthorized } from "@/server/authz";
import { apiSuccess, apiError } from "@/shared/lib/api-response";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

const BUCKET = "Documents_producer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.documents.read"],
    resource: "producer.documents",
  });
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdminClient();

  const docResult = await supabaseAdmin
    .from("producer_documents")
    .select("file_storage_key, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (docResult.error) {
    return apiError("PRODUCER_DOCUMENT_LOOKUP_FAILED", docResult.error.message, 500);
  }
  if (!docResult.data || docResult.data.tenant_id !== auth.context.user.tenantId) {
    return apiError("PRODUCER_DOCUMENT_NOT_FOUND", "Documento no encontrado", 404);
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(docResult.data.file_storage_key, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    return apiError("SIGNED_URL_FAILED", signedError?.message ?? "No se pudo generar URL firmada", 500);
  }

  return apiSuccess({ url: signed.signedUrl });
}
