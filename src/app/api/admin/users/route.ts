import { resolveAuthenticatedRequestUser } from "@/server/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import {
  ROLE_LABELS,
  isAppRole,
  type AppRole,
} from "@/shared/lib/auth";
import { apiError, apiSuccess } from "@/shared/lib/api-response";

interface CreateAdminUserBody {
  email?: string;
  password?: string;
  role?: AppRole;
  fullName?: string;
  licenseNumber?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    await sleep(200);
  }

  return null;
}

type UserListItem = {
  id: string;
  email: string;
  status: "active" | "inactive" | "blocked";
  role: AppRole | null;
  roleLabel: string;
  fullName: string;
  licenseNumber: string | null;
  createdAt: string;
};

type ProfileQueryRow = {
  id: string;
  email: string;
  status: "active" | "inactive" | "blocked";
  created_at: string;
  user_roles:
    | Array<{
        role:
          | Array<{
              key: string;
            }>
          | {
              key: string;
            }
          | null;
      }>
    | null;
  producers:
    | Array<{
        full_name: string;
      }>
    | null;
  mvz_profile:
    | Array<{
        full_name: string;
        license_number: string;
      }>
    | {
        full_name: string;
        license_number: string;
      }
    | null;
};

function normalizeUser(profile: ProfileQueryRow): UserListItem {
  const roleKey = (profile.user_roles ?? [])
    .flatMap((item) => {
      if (!item.role) {
        return [];
      }

      if (Array.isArray(item.role)) {
        return item.role.map((role) => role.key);
      }

      return [item.role.key];
    })
    .find(isAppRole) ?? null;

  const producer = (profile.producers ?? [])[0] ?? null;
  const mvzProfile = Array.isArray(profile.mvz_profile)
    ? profile.mvz_profile[0] ?? null
    : profile.mvz_profile;

  return {
    id: profile.id,
    email: profile.email,
    status: profile.status,
    role: roleKey,
    roleLabel: roleKey ? ROLE_LABELS[roleKey] : "Sin rol",
    fullName:
      mvzProfile?.full_name ??
      producer?.full_name ??
      profile.email.split("@")[0] ??
      "Usuario",
    licenseNumber: mvzProfile?.license_number ?? null,
    createdAt: profile.created_at,
  };
}

async function fetchUsers() {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id,email,status,created_at,user_roles(role:roles(key)),producers(full_name),mvz_profile:mvz_profiles(full_name,license_number)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileQueryRow[]).map((profile) => normalizeUser(profile));
}

export async function GET(request: Request) {
  const authResult = await resolveAuthenticatedRequestUser(request);
  if ("error" in authResult) {
    return apiError(authResult.error.code, authResult.error.message, authResult.error.status);
  }

  if (authResult.user.role !== "admin") {
    return apiError("FORBIDDEN", "Solo administradores pueden gestionar usuarios.", 403);
  }

  try {
    const users = await fetchUsers();
    return apiSuccess({ users });
  } catch (error) {
    return apiError(
      "USERS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible consultar usuarios.",
      500
    );
  }
}

export async function POST(request: Request) {
  const authResult = await resolveAuthenticatedRequestUser(request);
  if ("error" in authResult) {
    return apiError(authResult.error.code, authResult.error.message, authResult.error.status);
  }

  if (authResult.user.role !== "admin") {
    return apiError("FORBIDDEN", "Solo administradores pueden crear usuarios.", 403);
  }

  let body: CreateAdminUserBody;
  try {
    body = (await request.json()) as CreateAdminUserBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim();
  const role = body.role;
  const licenseNumber = body.licenseNumber?.trim();

  if (!email || !password || !fullName || !role || !isAppRole(role)) {
    return apiError(
      "INVALID_PAYLOAD",
      "Debe enviar email, password, fullName y role valido (admin, mvz o producer)."
    );
  }

  if (role === "mvz" && !licenseNumber) {
    return apiError("INVALID_PAYLOAD", "licenseNumber es requerido para rol MVZ.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const roleResult = await supabaseAdmin
    .from("roles")
    .select("id,key")
    .eq("key", role)
    .maybeSingle();

  if (roleResult.error) {
    return apiError("ROLE_QUERY_FAILED", roleResult.error.message, 500);
  }

  if (!roleResult.data) {
    return apiError("ROLE_NOT_FOUND", `No existe rol configurado para key: ${role}.`, 500);
  }

  const createResult = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createResult.error || !createResult.data.user) {
    return apiError(
      "USER_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear el usuario en Supabase Auth.",
      400
    );
  }

  const createdUserId = createResult.data.user.id;

  try {
    const profile = await waitForProfile(createdUserId);
    if (!profile) {
      throw new Error("PROFILE_NOT_CREATED");
    }

    const roleAssignResult = await supabaseAdmin.from("user_roles").insert({
      user_id: createdUserId,
      role_id: roleResult.data.id,
    });
    if (roleAssignResult.error) {
      throw new Error(roleAssignResult.error.message);
    }

    if (role === "producer") {
      const producerResult = await supabaseAdmin.from("producers").insert({
        user_id: createdUserId,
        full_name: fullName,
      });
      if (producerResult.error) {
        throw new Error(producerResult.error.message);
      }
    }

    if (role === "mvz") {
      const mvzResult = await supabaseAdmin.from("mvz_profiles").insert({
        user_id: createdUserId,
        full_name: fullName,
        license_number: licenseNumber!,
      });
      if (mvzResult.error) {
        throw new Error(mvzResult.error.message);
      }
    }

    const createdUserResult = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,status,created_at,user_roles(role:roles(key)),producers(full_name),mvz_profile:mvz_profiles(full_name,license_number)"
      )
      .eq("id", createdUserId)
      .single();

    if (createdUserResult.error || !createdUserResult.data) {
      throw new Error(createdUserResult.error?.message ?? "USER_READ_FAILED");
    }

    return apiSuccess(
      {
        user: normalizeUser(createdUserResult.data as ProfileQueryRow),
      },
      { status: 201 }
    );
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(createdUserId);

    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return apiError(
      "USER_PROVISION_FAILED",
      `No fue posible completar la asignacion de rol/perfil. (${message})`,
      400
    );
  }
}
