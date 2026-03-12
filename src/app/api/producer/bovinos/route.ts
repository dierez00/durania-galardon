import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  createSupabaseRlsServerClient,
  getSupabaseAdminClient,
} from "@/server/auth/supabase";
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
    .from("v_animals_sanitary")
    .select(
      "animal_id,upp_id,upp_name,upp_code,siniiga_tag,sex,birth_date,animal_status,mother_animal_id,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("siniiga_tag", { ascending: true });

  if (animalsResult.error) {
    return apiError("PRODUCER_BOVINOS_QUERY_FAILED", animalsResult.error.message, 500);
  }

  // Fetch upp statuses for quarantine check
  const uppStatusMap: Record<string, string> = {};
  if (accessibleUppIds.length > 0) {
    const uppsResult = await supabaseAdmin
      .from("upps")
      .select("id,status")
      .in("id", accessibleUppIds);
    if (!uppsResult.error && uppsResult.data) {
      for (const u of uppsResult.data) {
        uppStatusMap[u.id as string] = u.status as string;
      }
    }
  }

  return apiSuccess({
    bovinos: (animalsResult.data ?? []).map((row: {
      animal_id: string;
      upp_id: string;
      upp_name: string;
      upp_code: string | null;
      siniiga_tag: string;
      sex: "M" | "F";
      birth_date: string | null;
      animal_status: string;
      mother_animal_id: string | null;
      tb_date: string | null;
      tb_result: string | null;
      tb_valid_until: string | null;
      tb_status: string | null;
      br_date: string | null;
      br_result: string | null;
      br_valid_until: string | null;
      br_status: string | null;
      sanitary_alert: string | null;
    }) => ({
      id: row.animal_id,
      upp_id: row.upp_id,
      upp_name: row.upp_name,
      upp_code: row.upp_code,
      upp_status: uppStatusMap[row.upp_id] ?? "active",
      siniiga_tag: row.siniiga_tag,
      sex: row.sex,
      birth_date: row.birth_date,
      status: row.animal_status,
      mother_animal_id: row.mother_animal_id,
      sanitary: {
        tb_date: row.tb_date,
        tb_result: row.tb_result,
        tb_valid_until: row.tb_valid_until,
        tb_status: row.tb_status,
        br_date: row.br_date,
        br_result: row.br_result,
        br_valid_until: row.br_valid_until,
        br_status: row.br_status,
        alert: row.sanitary_alert,
      },
    })),
  });
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

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const createResult = await supabase
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
