import { createHash } from "crypto";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export const DOCUMENTS_BUCKET = "Documents_producer";

export const PERSONAL_DOCUMENT_TYPE_META: Record<string, { name: string; requiresExpiry: boolean }> = {
  ine: { name: "INE", requiresExpiry: true },
  curp: { name: "CURP", requiresExpiry: false },
  comprobante_domicilio: { name: "Comprobante de Domicilio", requiresExpiry: true },
};

export async function calculateFileHash(file: File): Promise<string> {
  const hash = createHash("sha256");
  const reader = file.stream().getReader();
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) {
      hash.update(value);
    }
    done = readerDone;
  }

  return `sha256:${hash.digest("hex")}`;
}

export async function ensureBucketExists(bucketName: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

  if (listError) {
    throw new Error(`Error al listar buckets: ${listError.message}`);
  }

  const exists = buckets.some(
    (bucket) => bucket.name === bucketName || bucket.name.toLowerCase() === bucketName.toLowerCase()
  );

  if (!exists) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: false,
    });

    if (createError) {
      throw new Error(`Error al crear bucket '${bucketName}': ${createError.message}`);
    }
  }
}

export async function uploadFileToSupabase(file: File, filePath: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }

  return data.path;
}

export async function findProducerIdForUserOrTenant(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  const byUser = await supabaseAdmin
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (byUser.data?.id) {
    return byUser.data.id;
  }

  const byTenant = await supabaseAdmin
    .from("producers")
    .select("id")
    .eq("owner_tenant_id", tenantId)
    .maybeSingle();

  if (byTenant.error) {
    throw new Error(byTenant.error.message);
  }

  return byTenant.data?.id ?? null;
}
