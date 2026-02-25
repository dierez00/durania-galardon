import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface ProducerBovinoBody {
  uppId?: string;
  siniigaTag?: string;
  sex?: "M" | "F";
  birthDate?: string;
  motherAnimalId?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const uppId = url.searchParams.get("uppId")?.trim();

  if (uppId) {
    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
    }
  }

  const accessibleUppIds = uppId ? [uppId] : await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length === 0) {
    return apiSuccess({ bovinos: [] });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const animalsResult = await supabaseAdmin
    .from("animals")
    .select("id,upp_id,siniiga_tag,sex,birth_date,status,mother_animal_id,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (animalsResult.error) {
    return apiError("PRODUCER_BOVINOS_QUERY_FAILED", animalsResult.error.message, 500);
  }

  return apiSuccess({ bovinos: animalsResult.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.write"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBovinoBody;
  try {
    body = (await request.json()) as ProducerBovinoBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  const siniigaTag = body.siniigaTag?.trim();
  const sex = body.sex;

  if (!uppId || !siniigaTag || !sex) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId, siniigaTag y sex.");
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("animals")
    .insert({
      tenant_id: auth.context.user.tenantId,
      upp_id: uppId,
      siniiga_tag: siniigaTag,
      sex,
      birth_date: body.birthDate ?? null,
      status: "active",
      mother_animal_id: body.motherAnimalId?.trim() || null,
    })
    .select("id,upp_id,siniiga_tag,sex,birth_date,status,mother_animal_id,created_at")
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "PRODUCER_BOVINO_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible registrar nacimiento/bovino.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.bovinos",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      siniigaTag,
      sex,
    },
  });

  return apiSuccess({ bovino: createResult.data }, { status: 201 });
}
