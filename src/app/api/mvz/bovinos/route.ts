import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.bovinos.read"],
    resource: "mvz.bovinos",
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

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const bovinosResult = await supabase
    .from("animals")
    .select("id,upp_id,siniiga_tag,sex,birth_date,status,mother_animal_id,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .in("upp_id", accessibleUppIds)
    .order("created_at", { ascending: false });

  if (bovinosResult.error) {
    return apiError("MVZ_BOVINOS_QUERY_FAILED", bovinosResult.error.message, 500);
  }

  const animals = bovinosResult.data ?? [];
  const animalIds = animals.map((row) => row.id);

  let testsByAnimal = new Map<string, { latestResult: string | null; tests: number }>();
  if (animalIds.length > 0) {
    const testsResult = await supabase
      .from("field_tests")
      .select("animal_id,result,created_at")
      .eq("tenant_id", auth.context.user.tenantId)
      .in("animal_id", animalIds)
      .order("created_at", { ascending: false });

    if (!testsResult.error) {
      testsByAnimal = (testsResult.data ?? []).reduce((acc, row) => {
        const current = acc.get(row.animal_id) ?? { latestResult: null, tests: 0 };
        if (current.latestResult === null) {
          current.latestResult = row.result;
        }
        current.tests += 1;
        acc.set(row.animal_id, current);
        return acc;
      }, new Map<string, { latestResult: string | null; tests: number }>());
    }
  }

  return apiSuccess({
    bovinos: animals.map((animal) => ({
      ...animal,
      sanitary: testsByAnimal.get(animal.id) ?? { latestResult: null, tests: 0 },
    })),
  });
}
