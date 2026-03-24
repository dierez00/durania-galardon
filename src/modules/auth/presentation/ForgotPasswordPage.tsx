"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface RecoveryResponse {
  ok?: boolean;
  error?: {
    message?: string;
  };
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/password/recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = (await response.json()) as RecoveryResponse;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible solicitar el correo de recuperacion.");
        return;
      }

      setSuccessMessage(
        "Si existe una cuenta asociada a este correo, enviaremos un enlace para restablecer la contrasena."
      );
    } catch {
      setErrorMessage("Ocurrio un error de red al solicitar la recuperacion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Recuperar contrasena</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo y te enviaremos un enlace para crear una nueva contrasena.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@siiniga.gob.mx"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">
                {successMessage}
              </p>
            ) : null}

            <Button className="w-full" disabled={submitting || !email.trim()} type="submit">
              {submitting ? "Enviando..." : "Enviar enlace"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link className="text-primary hover:underline" href="/login">
              Volver a iniciar sesion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
