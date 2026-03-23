"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { resolvePanelHomePath } from "@/shared/lib/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { parseAuthCallbackState, type AuthFlowType } from "@/modules/auth/shared/callback";

interface InviteContextResponse {
  ok?: boolean;
  data?: {
    panelType: "government" | "producer" | "mvz";
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    roleKey: string;
    roleName: string;
    assignedUpps: Array<{
      id: string;
      name: string;
      uppCode: string | null;
      accessLevel: string;
    }>;
  };
  error?: {
    message?: string;
  };
}

function resolveDefaultPanel(flowType: AuthFlowType | null) {
  return flowType === "invite" ? "Completar registro" : "Crear nueva contrasena";
}

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [flowType, setFlowType] = useState<AuthFlowType | null>(null);
  const [context, setContext] = useState<InviteContextResponse["data"] | null>(null);

  const title = useMemo(() => resolveDefaultPanel(flowType), [flowType]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const callbackState = parseAuthCallbackState(
          new URLSearchParams(searchParams.toString()),
          window.location.hash
        );
        const supabase = getSupabaseBrowserClient();

        if (callbackState.errorDescription) {
          if (!cancelled) {
            setErrorMessage(callbackState.errorDescription);
            setLoading(false);
          }
          return;
        }

        if (callbackState.accessToken && callbackState.refreshToken) {
          const setSessionResult = await supabase.auth.setSession({
            access_token: callbackState.accessToken,
            refresh_token: callbackState.refreshToken,
          });

          if (setSessionResult.error) {
            if (!cancelled) {
              setErrorMessage("No fue posible restaurar la sesion del enlace.");
              setLoading(false);
            }
            return;
          }
        } else if (callbackState.tokenHash && callbackState.type) {
          const verifyResult = await supabase.auth.verifyOtp({
            token_hash: callbackState.tokenHash,
            type: callbackState.type,
          });

          if (verifyResult.error) {
            if (!cancelled) {
              setErrorMessage(verifyResult.error.message);
              setLoading(false);
            }
            return;
          }
        }

        const sessionResult = await supabase.auth.getSession();
        const accessToken = sessionResult.data.session?.access_token;

        if (!accessToken) {
          if (!cancelled) {
            setErrorMessage("El enlace ya no es valido o la sesion no pudo establecerse.");
            setLoading(false);
          }
          return;
        }

        const response = await fetch("/api/auth/invite-context", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const body = (await response.json()) as InviteContextResponse;

        if (!response.ok || !body.ok || !body.data) {
          if (!cancelled) {
            setErrorMessage(body.error?.message ?? "No fue posible cargar el contexto de acceso.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setFlowType(callbackState.type);
          setContext(body.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Ocurrio un error al validar el enlace.");
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const updateResult = await supabase.auth.updateUser({ password });

      if (updateResult.error) {
        setErrorMessage(updateResult.error.message);
        return;
      }

      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user.id;

      if (!userId) {
        setErrorMessage("No fue posible resolver la sesion despues de guardar la contrasena.");
        return;
      }

      const roleResult = await resolveClientRole(supabase, userId);
      if (!roleResult.role) {
        setErrorMessage("La contrasena se actualizo, pero no fue posible resolver tu panel.");
        return;
      }

      const nextPanelType =
        roleResult.panelType ??
        (roleResult.role === "tenant_admin"
          ? "government"
          : roleResult.role === "mvz_government" || roleResult.role === "mvz_internal"
            ? "mvz"
            : "producer");

      router.replace(
        resolvePanelHomePath({
          panelType: nextPanelType,
          permissions: roleResult.permissions ?? [],
          isMvzInternal: roleResult.isMvzInternal,
        })
      );
    } catch {
      setErrorMessage("Ocurrio un error al guardar la nueva contrasena.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define una contrasena nueva para terminar tu acceso al panel.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Validando enlace...</p>
          ) : errorMessage ? (
            <div className="space-y-3">
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </p>
              <Link className="text-sm text-primary hover:underline" href="/login">
                Volver a iniciar sesion
              </Link>
            </div>
          ) : (
            <>
              {context ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">{context.tenantName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{context.panelType}</Badge>
                    <Badge variant="outline">{context.roleName}</Badge>
                  </div>
                  {context.assignedUpps.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Ranchos asignados</p>
                      <div className="flex flex-wrap gap-2">
                        {context.assignedUpps.map((upp) => (
                          <Badge key={upp.id} variant="outline">
                            {upp.name}
                            {upp.uppCode ? ` (${upp.uppCode})` : ""}
                            {` / ${upp.accessLevel}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contrasena</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {errorMessage ? (
                  <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    {errorMessage}
                  </p>
                ) : null}

                <Button className="w-full" disabled={submitting} type="submit">
                  {submitting ? "Guardando..." : "Guardar contrasena"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
