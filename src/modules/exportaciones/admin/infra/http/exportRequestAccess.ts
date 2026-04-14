import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminExportRequestLookupRow {
  id: string;
  tenant_id: string;
  producer_id?: string | null;
  upp_id?: string | null;
  status?: string | null;
  metrics_json?: { animal_ids?: string[] } | null;
  [key: string]: unknown;
}

export interface AdminExportUppContextRow {
  id: string;
  tenant_id: string;
  producer_id: string | null;
}

export async function resolveAdminAccessibleExportRequest<T extends AdminExportRequestLookupRow>(
  supabase: SupabaseClient,
  id: string,
  select: string
): Promise<{ data: T | null; error: string | null }> {
  const result = await supabase
    .from("export_requests")
    .select(select)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    return {
      data: null,
      error: result.error.message,
    };
  }

  return {
    data: (result.data as T | null) ?? null,
    error: null,
  };
}

export async function resolveAdminExportUppContext(
  supabase: SupabaseClient,
  uppId: string
): Promise<{ data: AdminExportUppContextRow | null; error: string | null }> {
  const result = await supabase
    .from("upps")
    .select("id,tenant_id,producer_id")
    .eq("id", uppId)
    .maybeSingle();

  if (result.error) {
    return {
      data: null,
      error: result.error.message,
    };
  }

  return {
    data: (result.data as AdminExportUppContextRow | null) ?? null,
    error: null,
  };
}
