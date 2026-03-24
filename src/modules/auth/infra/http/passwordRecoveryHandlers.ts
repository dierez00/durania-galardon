import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requestPasswordRecoveryEmail } from "@/server/auth/provisioning";
import { buildSetPasswordRedirectUrl } from "@/modules/auth/shared/redirects";

interface PasswordRecoveryBody {
  email?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: PasswordRecoveryBody;

  try {
    body = (await request.json()) as PasswordRecoveryBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar un email valido.");
  }

  try {
    await requestPasswordRecoveryEmail(email, buildSetPasswordRedirectUrl());
  } catch {
    // Respuesta generica para no exponer si el usuario existe o si el proveedor devolvio un error.
  }

  return apiSuccess({
    status: "recovery_email_requested",
  });
}
