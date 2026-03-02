import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

// ─── DELETE /api/admin/mvz/[id]/upps/[uppId] ─────────────────────────────────
// Soft-unassign: sets status='inactive' + unassigned_at=now()
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; uppId: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) return auth.response;

  const { id, uppId } = await params;
  const supabaseAdmin = getSupabaseProvisioningClient();

  const { data, error } = await supabaseAdmin
    .from("mvz_upp_assignments")
    .update({
      status: "inactive",
      unassigned_at: new Date().toISOString(),
    })
    .eq("mvz_profile_id", id)
    .eq("upp_id", uppId)
    .eq("status", "active")
    .select()
    .single();

  if (error) {
    return apiError("ADMIN_MVZ_UPP_UNASSIGN_FAILED", error.message, 500);
  }

  await logAuditEvent({
    request,
    action: "status_change",
    resource: "mvz_upp_assignment",
    resourceId: data.id,
    payload: { mvz_profile_id: id, upp_id: uppId, status: "inactive" },
    user: auth.context.user,
  });

  return apiSuccess({});
}
