"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock4, Stethoscope } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import { Textarea } from "@/shared/ui/textarea";
import { toneClass } from "@/shared/ui/theme";

const services = [
  { id: "tb", name: "Prueba Tuberculosis", duration: "35 min" },
  { id: "br", name: "Prueba Brucelosis", duration: "30 min" },
  { id: "inspeccion", name: "Inspeccion sanitaria UPP", duration: "50 min" },
];

const timeSlots = [
  "08:30",
  "09:15",
  "10:00",
  "11:00",
  "12:30",
  "15:00",
  "16:00",
];

function getNextDates(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toIcsDateString(date: Date, hour: string) {
  const [h, m] = hour.split(":").map(Number);
  const eventDate = new Date(date);
  eventDate.setHours(h, m, 0, 0);

  const yyyy = eventDate.getFullYear();
  const mm = `${eventDate.getMonth() + 1}`.padStart(2, "0");
  const dd = `${eventDate.getDate()}`.padStart(2, "0");
  const hh = `${eventDate.getHours()}`.padStart(2, "0");
  const mi = `${eventDate.getMinutes()}`.padStart(2, "0");
  const ss = "00";

  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}`;
}

function buildIcs({
  serviceName,
  selectedDate,
  selectedTime,
}: {
  serviceName: string;
  selectedDate: Date;
  selectedTime: string;
}) {
  const start = toIcsDateString(selectedDate, selectedTime);
  const endDate = new Date(selectedDate);
  const [h, m] = selectedTime.split(":").map(Number);
  endDate.setHours(h, m + 45, 0, 0);
  const end = toIcsDateString(endDate, `${endDate.getHours()}:${endDate.getMinutes()}`);

  const uid = `durania-${Date.now()}@durania.local`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DURANIA//CITAS//ES",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${serviceName}`,
    "DESCRIPTION:Cita generada desde landing publica de DURANIA.",
    "LOCATION:Modulo estatal DURANIA",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function LandingPage() {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string>("");
  const [dateValue, setDateValue] = useState<string>("");
  const [timeValue, setTimeValue] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "saved" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [folio] = useState(() => `DUR-${Date.now().toString().slice(-6)}`);

  const dateOptions = useMemo(() => getNextDates(10), []);
  const selectedService = services.find((item) => item.id === serviceId) ?? null;
  const selectedDate = dateOptions.find((item) => item.toISOString().slice(0, 10) === dateValue) ?? null;
  const canGoStep2 = Boolean(selectedService);
  const canGoStep3 = Boolean(selectedDate && timeValue);
  const canConfirm = Boolean(selectedService && selectedDate && timeValue && fullName);
  const canDownload = Boolean(selectedService && selectedDate && timeValue && requestStatus === "saved");

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-brand-surface to-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <header className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="accent">DURANIA 2026</Badge>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Agenda tu cita sanitaria en linea
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Flujo demostrativo de agendacion publica para productores y MVZ.
                Este MVP usa disponibilidad hardcodeada y registra la solicitud en CRM de citas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-card/95 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agendacion de citas</CardTitle>
                <Badge variant="secondary">Paso {step} de 3</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                <Button variant={step === 1 ? "default" : "outline"} onClick={() => setStep(1)}>
                  Servicio
                </Button>
                <Button
                  variant={step === 2 ? "default" : "outline"}
                  onClick={() => canGoStep2 && setStep(2)}
                  disabled={!canGoStep2}
                >
                  Fecha y hora
                </Button>
                <Button
                  variant={step === 3 ? "default" : "outline"}
                  onClick={() => canGoStep3 && setStep(3)}
                  disabled={!canGoStep3}
                >
                  Confirmacion
                </Button>
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow]",
                        serviceId === service.id
                          ? "border-primary bg-primary/6 shadow-xs"
                          : "border-border bg-card hover:border-brand-secondary/45 hover:bg-secondary/40"
                      )}
                      onClick={() => setServiceId(service.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{service.duration}</span>
                      </div>
                    </button>
                  ))}
                  <Button onClick={() => setStep(2)} disabled={!canGoStep2} className="w-full">
                    Continuar
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-medium">Selecciona fecha</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {dateOptions.map((date) => {
                        const value = date.toISOString().slice(0, 10);
                        return (
                          <button
                            key={value}
                            type="button"
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm transition-[border-color,background-color,color]",
                              dateValue === value
                                ? "border-primary bg-primary/6 text-primary"
                                : "border-border bg-card hover:border-brand-secondary/45 hover:bg-secondary/35"
                            )}
                            onClick={() => setDateValue(value)}
                          >
                            {formatDate(date)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Selecciona horario</p>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm transition-[border-color,background-color,color]",
                            timeValue === slot
                              ? "border-primary bg-primary/6 text-primary"
                              : "border-border bg-card hover:border-brand-secondary/45 hover:bg-secondary/35"
                          )}
                          onClick={() => setTimeValue(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Volver
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!canGoStep3}>
                      Continuar a confirmacion
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className={cn("rounded-2xl border p-4", toneClass("success", "surface"))}>
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">Cita lista para confirmar</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Folio de referencia: <span className="font-semibold text-foreground">{folio}</span>
                    </p>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4 text-sm">
                    <p><strong>Servicio:</strong> {selectedService?.name ?? "-"}</p>
                    <p><strong>Fecha:</strong> {selectedDate ? formatDate(selectedDate) : "-"}</p>
                    <p><strong>Hora:</strong> {timeValue || "-"}</p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border/80 bg-card p-4 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre completo</label>
                      <Input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Nombre del solicitante"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Telefono</label>
                      <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="10 digitos"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Correo</label>
                      <Input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="usuario@correo.com"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Notas</label>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                        placeholder="Detalle adicional para la solicitud"
                      />
                    </div>
                  </div>

                  {requestMessage ? (
                    <Alert variant={requestStatus === "saved" ? "success" : "error"}>
                      <AlertDescription>{requestMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Editar
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!selectedService || !selectedDate || !timeValue || !fullName) {
                          return;
                        }

                        setSubmitting(true);
                        setRequestStatus("idle");
                        setRequestMessage("");

                        try {
                          const response = await fetch("/api/public/appointments", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              fullName,
                              phone,
                              email,
                              requestedService: selectedService.name,
                              requestedDate: selectedDate.toISOString().slice(0, 10),
                              requestedTime: timeValue,
                              notes,
                            }),
                          });

                          const body = (await response.json()) as {
                            ok: boolean;
                            data?: { appointment: { id: string } };
                            error?: { message: string };
                          };

                          if (!response.ok || !body.ok) {
                            setRequestStatus("error");
                            setRequestMessage(
                              body.error?.message ?? "No fue posible registrar la cita."
                            );
                            return;
                          }

                          setRequestStatus("saved");
                          setRequestMessage(
                            `Solicitud registrada. Folio CRM: ${body.data?.appointment.id ?? folio}`
                          );
                        } catch {
                          setRequestStatus("error");
                          setRequestMessage("Error de red al registrar la cita.");
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      disabled={!canConfirm || submitting}
                    >
                      {submitting ? "Registrando..." : "Confirmar cita"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!selectedService || !selectedDate || !timeValue) {
                          return;
                        }

                        const ics = buildIcs({
                          serviceName: selectedService.name,
                          selectedDate,
                          selectedTime: timeValue,
                        });

                        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `${folio}.ics`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      disabled={!canDownload}
                    >
                      Descargar ICS
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Resumen del flujo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <span>Seleccion de servicio sanitario</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock4 className="h-4 w-4 text-primary" />
                <span>Eleccion de fecha y hora</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Confirmacion y descarga de cita (.ics)</span>
              </div>

              <Separator />

              <p className="text-muted-foreground">
                Esta seccion es publica y demostrativa. La solicitud se registra en CRM y la disponibilidad por
                MVZ/UPP sigue hardcodeada en esta fase.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
