"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock4,
  Menu,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Users2,
  Workflow,
  X,
} from "lucide-react";
import { parseAuthCallbackState } from "@/modules/auth/shared/callback";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import { Textarea } from "@/shared/ui/textarea";
import { ThemeLogo } from "@/shared/ui/branding/ThemeLogo";
import { toneClass } from "@/shared/ui/theme";

const services = [
  { id: "tb", name: "Prueba Tuberculosis", duration: "35 min" },
  { id: "br", name: "Prueba Brucelosis", duration: "30 min" },
  { id: "inspeccion", name: "Inspeccion sanitaria UPP", duration: "50 min" },
];

const timeSlots = ["08:30", "09:15", "10:00", "11:00", "12:30", "15:00", "16:00"];

const heroSlides = [
  {
    src: "/carrrousel/vacas1.webp",
    alt: "Ganado en corral",
    title: "Control sanitario con claridad",
    description: "Centraliza solicitudes y seguimiento sanitario en un solo flujo.",
  },
  {
    src: "/carrrousel/vacas2.jpg",
    alt: "Hato bovino en campo",
    title: "Productores y MVZ conectados",
    description: "Coordina citas, reduce llamadas y mejora tiempos de respuesta.",
  },
  {
    src: "/carrrousel/vacas%203.jpg",
    alt: "Ganado en alimentacion",
    title: "Operacion diaria mas simple",
    description: "Vista clara de etapas para que cada solicitud avance sin friccion.",
  },
];

const navItems = [
  { href: "#inicio", label: "Inicio" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#citas", label: "Citas" },
  { href: "#resumen", label: "Resumen de flujo" },
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

  const uid = `email-${Date.now()}@email.local`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//O.C.H.O.A//CITAS//ES",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${serviceName}`,
    "DESCRIPTION:Cita generada desde landing publica de O.C.H.O.A.",
    "LOCATION:Modulo estatal O.C.H.O.A",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function LandingPage() {
  return (
    <Suspense fallback={<LandingPageLoading />}>
      <LandingPageContent />
    </Suspense>
  );
}

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);
  const [folio] = useState(() => `DUR-${Date.now().toString().slice(-6)}`);

  const dateOptions = useMemo(() => getNextDates(10), []);
  const selectedService = services.find((item) => item.id === serviceId) ?? null;
  const selectedDate = dateOptions.find((item) => item.toISOString().slice(0, 10) === dateValue) ?? null;
  const canGoStep2 = Boolean(selectedService);
  const canGoStep3 = Boolean(selectedDate && timeValue);
  const canConfirm = Boolean(selectedService && selectedDate && timeValue && fullName);
  const canDownload = Boolean(selectedService && selectedDate && timeValue && requestStatus === "saved");

  useEffect(() => {
    const callbackState = parseAuthCallbackState(
      new URLSearchParams(searchParams.toString()),
      window.location.hash
    );

    const hasAuthCallbackPayload =
      Boolean(callbackState.type && callbackState.tokenHash) ||
      Boolean(callbackState.accessToken && callbackState.refreshToken) ||
      Boolean(callbackState.errorCode || callbackState.errorDescription);

    if (!hasAuthCallbackPayload) {
      return;
    }

    const nextParams = new URLSearchParams();

    if (callbackState.type) {
      nextParams.set("type", callbackState.type);
    }
    if (callbackState.tokenHash) {
      nextParams.set("token_hash", callbackState.tokenHash);
    }
    if (callbackState.accessToken) {
      nextParams.set("access_token", callbackState.accessToken);
    }
    if (callbackState.refreshToken) {
      nextParams.set("refresh_token", callbackState.refreshToken);
    }
    if (callbackState.errorCode) {
      nextParams.set("error_code", callbackState.errorCode);
    }
    if (callbackState.errorDescription) {
      nextParams.set("error_description", callbackState.errorDescription);
    }

    const query = nextParams.toString();
    router.replace(query ? `/auth/set-password?${query}` : "/auth/set-password");
  }, [router, searchParams]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const onSelect = () => {
      setActiveSlide(carouselApi.selectedScrollSnap());
    };

    onSelect();
    carouselApi.on("select", onSelect);

    const interval = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
      } else {
        carouselApi.scrollTo(0);
      }
    }, 5200);

    return () => {
      carouselApi.off("select", onSelect);
      clearInterval(interval);
    };
  }, [carouselApi]);

  return (
    <div className="min-h-screen scroll-smooth bg-[radial-gradient(circle_at_top_left,_rgba(130,195,196,0.34),_transparent_42%),radial-gradient(circle_at_82%_22%,_rgba(196,183,96,0.24),_transparent_34%),linear-gradient(170deg,var(--background)_0%,color-mix(in_srgb,var(--brand-surface)_80%,var(--brand-secondary)_20%)_100%)]">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <a href="#inicio" className="group flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-border/70 bg-card p-1.5 transition-transform duration-300 group-hover:scale-105">
              <ThemeLogo alt="O.C.H.O.A" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-foreground">O.C.H.O.A</p>
              <p className="text-[11px] text-muted-foreground">Operacion y Control de Hatos Offline Automatizados</p>
            </div>
          </a>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild className="hidden md:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden border-t border-border/70 bg-background/90 transition-all duration-300 md:hidden",
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Button asChild className="mt-2">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-6 md:space-y-14 md:px-6 md:pt-10">
        <section id="inicio" className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="relative overflow-hidden border-border/70 bg-card/90 shadow-lg">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,87,88,0.06)_0%,transparent_54%)]" />
            <CardContent className="relative flex h-full flex-col justify-between gap-6 p-6 md:p-8">
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-2 duration-500">
                <Badge variant="accent" className="w-fit">
                  Plataforma publica 2026
                </Badge>
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
                  Tu gestion sanitaria empieza con una agenda clara
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                  O.C.H.O.A facilita la coordinacion entre productores y equipos veterinarios con una experiencia simple,
                  rapida y enfocada en seguimiento real de solicitudes.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xl font-semibold text-foreground">+1</p>
                  <p>Canal publico de citas</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xl font-semibold text-foreground">3 pasos</p>
                  <p>Flujo para solicitar atencion</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xl font-semibold text-foreground">CRM</p>
                  <p>Registro central de solicitudes</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="group">
                  <a href="#citas">
                    Generar cita
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 bg-card/95 shadow-lg">
            <CardContent className="space-y-4 p-4 md:p-5">
              <Carousel setApi={setCarouselApi} opts={{ loop: true }} className="w-full">
                <CarouselContent>
                  {heroSlides.map((slide) => (
                    <CarouselItem key={slide.src}>
                      <div className="relative h-[300px] overflow-hidden rounded-2xl md:h-[380px]">
                        <Image src={slide.src} alt={slide.alt} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 50vw" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,24,26,0.65)_0%,rgba(10,24,26,0.05)_56%)]" />
                        <div className="absolute bottom-0 left-0 right-0 space-y-1 p-4 text-white md:p-5">
                          <p className="text-lg font-semibold">{slide.title}</p>
                          <p className="text-sm text-white/85">{slide.description}</p>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3 top-1/2 border-white/40 bg-black/35 text-white hover:bg-black/60" />
                <CarouselNext className="right-3 top-1/2 border-white/40 bg-black/35 text-white hover:bg-black/60" />
              </Carousel>

              <div className="flex items-center justify-center gap-2">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-300",
                      activeSlide === index ? "w-8 bg-primary" : "w-2.5 bg-primary/30 hover:bg-primary/55"
                    )}
                    onClick={() => carouselApi?.scrollTo(index)}
                    aria-label={`Ir a imagen ${index + 1}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="beneficios" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary">Beneficios</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Un sistema pensado para campo, oficina y supervision
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  <Workflow className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Flujo claro de solicitud</h3>
                <p className="text-sm text-muted-foreground">
                  Del servicio a la confirmacion, cada paso esta ordenado para reducir errores y vueltas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  <Users2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Conexion productor - MVZ</h3>
                <p className="text-sm text-muted-foreground">
                  Mejor comunicacion para priorizar atenciones y mantener trazabilidad de cada caso.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Registro confiable</h3>
                <p className="text-sm text-muted-foreground">
                  Cada solicitud se guarda en CRM para seguimiento, control y mejora continua del servicio.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="como-funciona" className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Como funciona</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Una experiencia directa para solicitar atencion sanitaria
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                title: "Selecciona servicio",
                text: "Elige el tipo de atencion segun necesidad sanitaria.",
              },
              {
                title: "Elige fecha y hora",
                text: "Consulta disponibilidad y aparta tu espacio.",
              },
              {
                title: "Confirma datos",
                text: "Completa datos basicos para contacto y seguimiento.",
              },
              {
                title: "Recibe folio",
                text: "Tu solicitud queda registrada para gestion administrativa.",
              },
            ].map((item, index) => (
              <Card key={item.title} className="border-border/70 bg-card/95">
                <CardContent className="space-y-3 p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="modulos" className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Modulos principales</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Capacidades clave que sostienen la operacion
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Citas", text: "Solicitud, seguimiento y control de estado." },
              { title: "Usuarios", text: "Gestion de perfiles, roles y accesos." },
              { title: "Ranchos", text: "Contexto territorial y organizacion operativa." },
              { title: "Bovinos", text: "Datos base para control y trazabilidad." },
            ].map((module) => (
              <Card key={module.title} className="border-border/70 bg-card/95">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-primary">
                    <Sprout className="h-4 w-4" />
                    <h3 className="font-semibold text-foreground">{module.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{module.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="citas" className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Generar citas</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Agenda una atencion en minutos
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                      <p>
                        <strong>Servicio:</strong> {selectedService?.name ?? "-"}
                      </p>
                      <p>
                        <strong>Fecha:</strong> {selectedDate ? formatDate(selectedDate) : "-"}
                      </p>
                      <p>
                        <strong>Hora:</strong> {timeValue || "-"}
                      </p>
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
                              setRequestMessage(body.error?.message ?? "No fue posible registrar la cita.");
                              return;
                            }

                            setRequestStatus("saved");
                            setRequestMessage(`Solicitud registrada. Folio CRM: ${body.data?.appointment.id ?? folio}`);
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

            <Card id="resumen" className="bg-card/95 backdrop-blur">
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
          </div>
        </section>

        <section id="faq" className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">FAQ</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                q: "La cita queda confirmada de inmediato?",
                a: "La solicitud se registra al instante y el equipo la procesa en el CRM de citas.",
              },
              {
                q: "Puedo cambiar servicio, fecha u hora antes de enviar?",
                a: "Si. En el flujo puedes regresar y ajustar seleccion antes de confirmar.",
              },
              {
                q: "Para que sirve el archivo ICS?",
                a: "Te ayuda a guardar la cita en tu calendario local y tener recordatorio.",
              },
              {
                q: "Necesito login para generar cita?",
                a: "No, la solicitud publica funciona sin login. El login es para usuarios internos.",
              },
            ].map((item) => (
              <Card key={item.q} className="border-border/70 bg-card/95">
                <CardContent className="space-y-2 p-5">
                  <h3 className="font-semibold text-foreground">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border/70 bg-[linear-gradient(120deg,rgba(6,87,88,0.98)_0%,rgba(19,72,73,0.95)_40%,rgba(196,183,96,0.42)_140%)] p-6 text-white-foreground md:p-8">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white-foreground/80">Listo para comenzar</p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Accede y lleva la operacion sanitaria a otro nivel</h2>
              <p className="mt-2 max-w-2xl text-sm text-white-foreground/80">
                Usa la plataforma para ordenar solicitudes, dar seguimiento y sostener una atencion mas confiable.
              </p>
            </div>
            <Button asChild variant="secondary" className="group">
              <Link href="/login">
                Ir a Login
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingPageLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-brand-surface to-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  );
}
