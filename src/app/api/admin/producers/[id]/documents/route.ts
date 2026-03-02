import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const supabaseAdmin = getSupabaseProvisioningClient();

  type DocumentRow = {
    id: string;
    status: string;
    is_current: boolean;
    expiry_date: string | null;
    uploaded_at: string;
    document_types: { name: string } | null;
  };

  const docsResult = await supabaseAdmin
    .from("producer_documents")
    .select(
      "id,status,is_current,expiry_date,uploaded_at,document_types(name)"
    )
    .eq("producer_id", id)
    .order("uploaded_at", { ascending: false });

  if (docsResult.error) {
    return apiError("ADMIN_PRODUCER_DOCS_QUERY_FAILED", docsResult.error.message, 500);
  }

  const documents = ((docsResult.data as unknown as DocumentRow[]) ?? []).map((d) => ({
    id: d.id,
    documentType: d.document_types?.name ?? "Documento",
    status: d.status,
    isCurrent: d.is_current,
    expiryDate: d.expiry_date,
    uploadedAt: d.uploaded_at,
  }));

  return apiSuccess({ documents });
}
