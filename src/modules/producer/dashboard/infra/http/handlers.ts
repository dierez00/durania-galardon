import { apiSuccess } from "@/shared/lib/api-response";
import { PRODUCER_SETTINGS_NAV_PERMISSIONS } from "@/shared/lib/auth";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import {
  logProducerAccessServer,
  sampleProducerAccessIds,
  summarizeProducerAccessError,
} from "@/server/debug/producerAccess";

type QuickActionTone =
  | "brand"
  | "secondary"
  | "accent"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error";

type QuickActionIcon = "animals" | "movements" | "exports" | "documents" | "settings" | "profile";

interface DashboardQuickAction {
  key: string;
  label: string;
  description: string;
  href: string;
  tone: QuickActionTone;
  icon: QuickActionIcon;
}

interface DashboardActivityPoint {
  period: string;
  movements: number;
  exports: number;
}

interface DocumentStatusPoint {
  key: "pending" | "validated" | "expired" | "rejected";
  label: string;
  total: number;
}

const DOCUMENT_STATUS_LABELS: Record<DocumentStatusPoint["key"], string> = {
  pending: "En revision",
  validated: "Validados",
  expired: "Vencidos",
  rejected: "Rechazados",
};

function buildProducerQuickActions(options: {
  uppId: string | null;
  hasPermission: (permission: string) => boolean;
}): DashboardQuickAction[] {
  const { uppId, hasPermission } = options;
  const projectBase = uppId ? `/producer/projects/${uppId}` : null;
  const actions: DashboardQuickAction[] = [];

  if (hasPermission("producer.bovinos.read")) {
    actions.push({
      key: "animals",
      label: "Animales",
      description: "Ver inventario sanitario y detalle por bovino.",
      href: projectBase ? `${projectBase}/animales` : "/producer/bovinos",
      tone: "brand",
      icon: "animals",
    });
  }

  if (hasPermission("producer.movements.read")) {
    actions.push({
      key: "movements",
      label: "Movilizaciones",
      description: "Revisar traslados en proceso y su estatus.",
      href: projectBase ? `${projectBase}/movilizacion` : "/producer/movilizacion",
      tone: "info",
      icon: "movements",
    });
  }

  if (hasPermission("producer.exports.read")) {
    actions.push({
      key: "exports",
      label: "Exportaciones",
      description: "Consultar solicitudes y validaciones de exportacion.",
      href: projectBase ? `${projectBase}/exportaciones` : "/producer/exportaciones",
      tone: "accent",
      icon: "exports",
    });
  }

  if (hasPermission("producer.documents.read")) {
    actions.push({
      key: "documents",
      label: "Documentos",
      description: "Ver cumplimiento documental del productor y rancho.",
      href: projectBase ? `${projectBase}/documentos` : "/producer/documentos",
      tone: "warning",
      icon: "documents",
    });
  }

  if (PRODUCER_SETTINGS_NAV_PERMISSIONS.some((permission) => hasPermission(permission))) {
    actions.push({
      key: "settings",
      label: "Configuracion",
      description: "Administrar configuracion del panel y permisos.",
      href: "/producer/settings",
      tone: "secondary",
      icon: "settings",
    });
  }

  if (hasPermission("producer.profile.read")) {
    actions.push({
      key: "profile",
      label: "Mi perfil",
      description: "Editar informacion personal y datos de contacto.",
      href: "/producer/profile",
      tone: "neutral",
      icon: "profile",
    });
  }

  return actions;
}

function buildMonthlyBuckets(monthCount = 6) {
  const now = new Date();
  const buckets: Array<{ key: string; label: string; monthStart: Date }> = [];
  const formatter = new Intl.DateTimeFormat("es-MX", { month: "short" });

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: `${formatter.format(date).replace(".", "")} ${String(date.getUTCFullYear()).slice(-2)}`,
      monthStart: date,
    });
  }

  return buckets;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.dashboard.read"],
    resource: "producer.dashboard",
  });
  if (!auth.ok) return auth.response;

  const tenantId = auth.context.user.tenantId;
  const url = new URL(request.url);
  const uppId = url.searchParams.get("uppId") ?? null;

  logProducerAccessServer("producer/dashboard:get:start", {
    userId: auth.context.user.id,
    role: auth.context.user.role,
    tenantId,
    tenantSlug: auth.context.user.tenantSlug,
    panelType: auth.context.user.panelType,
    uppId,
  });

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const hasPermission = (permission: string) => auth.context.permissions.includes(permission as never);

  let animalsActiveQ = supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  let animalsTransitQ = supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "in_transit");

  let movementsQ = supabase
    .from("movement_requests")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "requested");

  let exportsQ = supabase
    .from("export_requests")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["requested", "mvz_validated"]);

  if (uppId) {
    animalsActiveQ = animalsActiveQ.eq("upp_id", uppId);
    animalsTransitQ = animalsTransitQ.eq("upp_id", uppId);
    movementsQ = movementsQ.eq("upp_id", uppId);
    exportsQ = exportsQ.eq("upp_id", uppId);
  }

  const docsQ = supabase
    .from("producer_documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  const uppsQ = supabase
    .from("upps")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const [uppsRes, animalsActiveRes, animalsTransitRes, movementsRes, exportsRes, docsRes] =
    await Promise.all([uppsQ, animalsActiveQ, animalsTransitQ, movementsQ, exportsQ, docsQ]);

  const monthlyBuckets = buildMonthlyBuckets(6);
  const trendStart = monthlyBuckets[0]?.monthStart.toISOString() ?? new Date(0).toISOString();

  let movementsTrendQ = supabase
    .from("movement_requests")
    .select("created_at, upp_id")
    .eq("tenant_id", tenantId)
    .gte("created_at", trendStart);

  let exportsTrendQ = supabase
    .from("export_requests")
    .select("created_at, upp_id")
    .eq("tenant_id", tenantId)
    .gte("created_at", trendStart);

  if (uppId) {
    movementsTrendQ = movementsTrendQ.eq("upp_id", uppId);
    exportsTrendQ = exportsTrendQ.eq("upp_id", uppId);
  }

  const producerDocsStatusQ = supabase
    .from("producer_documents")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("is_current", true);

  let uppDocsStatusQ = supabase
    .from("upp_documents")
    .select("status, upp_id")
    .eq("tenant_id", tenantId)
    .eq("is_current", true);

  if (uppId) {
    uppDocsStatusQ = uppDocsStatusQ.eq("upp_id", uppId);
  }

  const [
    movementsTrendRes,
    exportsTrendRes,
    producerDocsStatusRes,
    uppDocsStatusRes,
  ] = await Promise.all([movementsTrendQ, exportsTrendQ, producerDocsStatusQ, uppDocsStatusQ]);

  let quarantineCount = 0;
  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  logProducerAccessServer("producer/dashboard:get:accessible-ids", {
    userId: auth.context.user.id,
    tenantId,
    accessibleUpps: sampleProducerAccessIds(accessibleUppIds),
  });
  if (accessibleUppIds.length > 0) {
    const scopedUppIds = uppId ? [uppId] : accessibleUppIds;
    const quarantinesRes = await supabase
      .from("state_quarantines")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .in("upp_id", scopedUppIds);
    quarantineCount = quarantinesRes.count ?? 0;
  } else {
    logProducerAccessServer("producer/dashboard:get:empty-access", {
      userId: auth.context.user.id,
      tenantId,
      uppId,
    });
  }

  logProducerAccessServer("producer/dashboard:get:end", {
    userId: auth.context.user.id,
    tenantId,
    uppId,
    queryErrors: {
      upps: summarizeProducerAccessError(uppsRes.error),
      animalsActive: summarizeProducerAccessError(animalsActiveRes.error),
      animalsTransit: summarizeProducerAccessError(animalsTransitRes.error),
      movements: summarizeProducerAccessError(movementsRes.error),
      exports: summarizeProducerAccessError(exportsRes.error),
      documents: summarizeProducerAccessError(docsRes.error),
      movementsTrend: summarizeProducerAccessError(movementsTrendRes.error),
      exportsTrend: summarizeProducerAccessError(exportsTrendRes.error),
      producerDocumentStatus: summarizeProducerAccessError(producerDocsStatusRes.error),
      uppDocumentStatus: summarizeProducerAccessError(uppDocsStatusRes.error),
    },
    kpis: {
      totalUpps: uppsRes.count ?? 0,
      totalAnimals: animalsActiveRes.count ?? 0,
      bovinosInTransit: animalsTransitRes.count ?? 0,
      activeMovements: movementsRes.count ?? 0,
      activeExports: exportsRes.count ?? 0,
      pendingDocuments: docsRes.count ?? 0,
      activeQuarantines: quarantineCount,
    },
  });

  const trendByMonth = new Map<string, DashboardActivityPoint>();
  for (const bucket of monthlyBuckets) {
    trendByMonth.set(bucket.key, {
      period: bucket.label,
      movements: 0,
      exports: 0,
    });
  }

  (movementsTrendRes.data ?? []).forEach((row) => {
    if (!row.created_at) return;
    const bucketKey = row.created_at.slice(0, 7);
    const point = trendByMonth.get(bucketKey);
    if (point) point.movements += 1;
  });

  (exportsTrendRes.data ?? []).forEach((row) => {
    if (!row.created_at) return;
    const bucketKey = row.created_at.slice(0, 7);
    const point = trendByMonth.get(bucketKey);
    if (point) point.exports += 1;
  });

  const documentStatusAccumulator: Record<DocumentStatusPoint["key"], number> = {
    pending: 0,
    validated: 0,
    expired: 0,
    rejected: 0,
  };

  const countDocumentStatus = (status: string | null) => {
    if (!status) return;
    if (status in documentStatusAccumulator) {
      documentStatusAccumulator[status as DocumentStatusPoint["key"]] += 1;
    }
  };

  (producerDocsStatusRes.data ?? []).forEach((row) => countDocumentStatus(row.status));
  (uppDocsStatusRes.data ?? []).forEach((row) => countDocumentStatus(row.status));

  const quickActions = buildProducerQuickActions({
    uppId,
    hasPermission,
  });

  return apiSuccess({
    kpis: {
      totalUpps: uppsRes.count ?? 0,
      totalAnimals: animalsActiveRes.count ?? 0,
      bovinosInTransit: animalsTransitRes.count ?? 0,
      activeMovements: movementsRes.count ?? 0,
      activeExports: exportsRes.count ?? 0,
      pendingDocuments: docsRes.count ?? 0,
      activeQuarantines: quarantineCount,
    },
    quickActions,
    charts: {
      activityTrend: Array.from(trendByMonth.values()),
      documentStatus: (Object.keys(documentStatusAccumulator) as Array<DocumentStatusPoint["key"]>).map(
        (statusKey) => ({
          key: statusKey,
          label: DOCUMENT_STATUS_LABELS[statusKey],
          total: documentStatusAccumulator[statusKey],
        })
      ),
    },
  });
}
