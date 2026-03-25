import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENVS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "API_OCR_URL",
];

for (const name of REQUIRED_ENVS) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const BATCH_SIZE = Number(process.env.OCR_BACKFILL_BATCH_SIZE ?? "50");
const LIMIT = Number(process.env.OCR_BACKFILL_LIMIT ?? "0");
const DRY_RUN = process.env.OCR_BACKFILL_DRY_RUN === "1";
const OCR_TIMEOUT_MS = Number(process.env.OCR_BACKFILL_TIMEOUT_MS ?? "300000");
const OCR_MAX_RETRIES = Number(process.env.OCR_BACKFILL_MAX_RETRIES ?? "2");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function buildOcrCandidateUrls() {
  const configured = process.env.API_OCR_URL.trim();
  const urls = [configured];

  if (configured.startsWith("http://")) {
    urls.push(`https://${configured.slice("http://".length)}`);
  }

  return urls;
}

function getFileNameFromStorageKey(fileStorageKey) {
  const parts = fileStorageKey.split("/");
  return parts[parts.length - 1] || `document-${Date.now()}.bin`;
}

function inferOcrDocumentType(documentTypeHint, fileName) {
  const normalized = `${documentTypeHint ?? ""} ${fileName ?? ""}`.toLowerCase();

  if (normalized.includes("curp")) {
    return { documentType: "curp", strategy: "keyword-curp", input: normalized };
  }

  if (normalized.includes("ine") || normalized.includes("elector") || normalized.includes("credencial")) {
    return { documentType: "ine", strategy: "keyword-ine", input: normalized };
  }

  return { documentType: null, strategy: "skip-unclassified", input: normalized };
}

async function requestOcr(file, documentTypeHint) {
  const inferred = inferOcrDocumentType(documentTypeHint, file.name);
  if (!inferred.documentType) {
    return {
      fullText: null,
      ocrText: null,
      ocrFields: null,
      ocrMetadata: {
        ocr_processing: {
          source: "backfill",
          status: "skipped",
          processed_at: new Date().toISOString(),
          inference_strategy: inferred.strategy,
          reason: "Document type could not be classified as INE/CURP",
        },
      },
    };
  }

  let lastError = null;

  for (const baseUrl of buildOcrCandidateUrls()) {
    const endpoint = new URL("ocr", normalizeBaseUrl(baseUrl));
    endpoint.searchParams.set("document_type", inferred.documentType);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.detail ?? `OCR request failed with status ${response.status}`);
        if (response.status === 405) {
          lastError = error;
          continue;
        }
        throw error;
      }

      const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
      const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const fullText = typeof fields.full_text === "string" ? fields.full_text : null;

      return {
        fullText,
        ocrText: fullText,
        ocrFields: Object.keys(fields).length > 0 ? fields : null,
        ocrMetadata: {
          ...metadata,
          ocr_processing: {
            source: "backfill",
            status: "ok",
            processed_at: new Date().toISOString(),
            inferred_document_type: inferred.documentType,
            inference_strategy: inferred.strategy,
            endpoint_used: endpoint.origin,
          },
        },
      };
    } catch (error) {
      lastError = error;

      const message = String(lastError?.message ?? "").toLowerCase();
      const isTransientNetworkError =
        message.includes("aborted") ||
        message.includes("timeout") ||
        message.includes("econn") ||
        message.includes("fetch failed");

      if (isTransientNetworkError) {
        for (let retry = 1; retry <= OCR_MAX_RETRIES; retry += 1) {
          await sleep(1000 * retry);

          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), OCR_TIMEOUT_MS);
          try {
            const retryFormData = new FormData();
            retryFormData.append("file", file);

            const retryResponse = await fetch(endpoint, {
              method: "POST",
              body: retryFormData,
              signal: retryController.signal,
            });

            const retryBody = await retryResponse.json().catch(() => ({}));
            if (!retryResponse.ok) {
              lastError = new Error(
                retryBody.detail ?? `OCR request failed with status ${retryResponse.status}`
              );
              continue;
            }

            const retryFields =
              retryBody.fields && typeof retryBody.fields === "object" ? retryBody.fields : {};
            const retryMetadata =
              retryBody.metadata && typeof retryBody.metadata === "object" ? retryBody.metadata : {};
            const retryFullText =
              typeof retryFields.full_text === "string" ? retryFields.full_text : null;

            return {
              fullText: retryFullText,
              ocrText: retryFullText,
              ocrFields: Object.keys(retryFields).length > 0 ? retryFields : null,
              ocrMetadata: {
                ...retryMetadata,
                ocr_processing: {
                  source: "backfill",
                  status: "ok",
                  processed_at: new Date().toISOString(),
                  inferred_document_type: inferred.documentType,
                  inference_strategy: inferred.strategy,
                  endpoint_used: endpoint.origin,
                  retries_used: retry,
                },
              },
            };
          } catch (retryError) {
            lastError = retryError;
          } finally {
            clearTimeout(retryTimeout);
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("OCR request failed");
}

async function markError(tableName, id, error) {
  try {
    const payload = {
      ocr_metadata: {
        status: "error",
        source: "backfill",
        processed_at: new Date().toISOString(),
        error: {
          message: error instanceof Error ? error.message : "Unknown OCR processing error",
        },
      },
    };

    const updateResult = await supabase.from(tableName).update(payload).eq("id", id);
    if (updateResult.error) {
      console.error(`[${tableName}] Failed to persist error for ${id}:`, updateResult.error.message);
    }
  } catch (persistError) {
    console.error(
      `[${tableName}] Failed to persist error for ${id}:`,
      persistError instanceof Error ? persistError.message : persistError
    );
  }
}

async function processProducerRow(row, stats) {
  const documentTypeHint = row.document_type?.key ?? "";
  const fileName = getFileNameFromStorageKey(row.file_storage_key);

  const download = await supabase.storage.from("Documents_producer").download(row.file_storage_key);
  if (download.error || !download.data) {
    stats.failed += 1;
    await markError("producer_documents", row.id, new Error(download.error?.message ?? "Storage download failed"));
    return;
  }

  const file = new File([download.data], fileName, {
    type: download.data.type || "application/octet-stream",
  });

  try {
    const ocr = await requestOcr(file, documentTypeHint);
    if (!DRY_RUN) {
      const updateResult = await supabase
        .from("producer_documents")
        .update({
          full_text: ocr.fullText,
          ocr_text: ocr.ocrText,
          ocr_fields: ocr.ocrFields,
          ocr_metadata: ocr.ocrMetadata,
          extracted_fields: ocr.ocrFields,
        })
        .eq("id", row.id);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    stats.success += 1;
  } catch (error) {
    stats.failed += 1;
    console.error(`[producer_documents] OCR failed for ${row.id}:`, error instanceof Error ? error.message : error);
    if (!DRY_RUN) {
      await markError("producer_documents", row.id, error);
    }
  }
}

async function processUppRow(row, stats) {
  const documentTypeHint = row.document_type ?? "";
  const fileName = getFileNameFromStorageKey(row.file_storage_key);

  const download = await supabase.storage.from("Documents_producer").download(row.file_storage_key);
  if (download.error || !download.data) {
    stats.failed += 1;
    await markError("upp_documents", row.id, new Error(download.error?.message ?? "Storage download failed"));
    return;
  }

  const file = new File([download.data], fileName, {
    type: download.data.type || "application/octet-stream",
  });

  try {
    const ocr = await requestOcr(file, documentTypeHint);
    if (!DRY_RUN) {
      const updateResult = await supabase
        .from("upp_documents")
        .update({
          full_text: ocr.fullText,
          ocr_text: ocr.ocrText,
          ocr_fields: ocr.ocrFields,
          ocr_metadata: ocr.ocrMetadata,
        })
        .eq("id", row.id);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    stats.success += 1;
  } catch (error) {
    stats.failed += 1;
    console.error(`[upp_documents] OCR failed for ${row.id}:`, error instanceof Error ? error.message : error);
    if (!DRY_RUN) {
      await markError("upp_documents", row.id, error);
    }
  }
}

async function processProducerDocuments() {
  const stats = { scanned: 0, skipped: 0, success: 0, failed: 0 };
  let offset = 0;

  while (true) {
    const query = supabase
      .from("producer_documents")
      .select("id,file_storage_key,is_current,ocr_text,ocr_fields,document_type:document_types(key)")
      .eq("is_current", true)
      .order("uploaded_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    const result = await query;
    if (result.error) {
      throw new Error(`producer_documents query failed: ${result.error.message}`);
    }

    const rows = result.data ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (LIMIT > 0 && stats.scanned >= LIMIT) {
        return stats;
      }

      stats.scanned += 1;
      const hasOcr = row.ocr_text || row.ocr_fields;
      if (hasOcr) {
        stats.skipped += 1;
        continue;
      }

      await processProducerRow(row, stats);
    }

    offset += BATCH_SIZE;
  }

  return stats;
}

async function processUppDocuments() {
  const stats = { scanned: 0, skipped: 0, success: 0, failed: 0 };
  let offset = 0;

  while (true) {
    const query = supabase
      .from("upp_documents")
      .select("id,file_storage_key,is_current,document_type,ocr_text,ocr_fields")
      .eq("is_current", true)
      .order("uploaded_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    const result = await query;
    if (result.error) {
      throw new Error(`upp_documents query failed: ${result.error.message}`);
    }

    const rows = result.data ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (LIMIT > 0 && stats.scanned >= LIMIT) {
        return stats;
      }

      stats.scanned += 1;
      const hasOcr = row.ocr_text || row.ocr_fields;
      if (hasOcr) {
        stats.skipped += 1;
        continue;
      }

      await processUppRow(row, stats);
    }

    offset += BATCH_SIZE;
  }

  return stats;
}

(async () => {
  const startedAt = Date.now();
  console.log("Starting OCR documents backfill", {
    dryRun: DRY_RUN,
    batchSize: BATCH_SIZE,
    limit: LIMIT || null,
  });

  const producerStats = await processProducerDocuments();
  const uppStats = await processUppDocuments();

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("Backfill completed", {
    elapsedSec,
    producer_documents: producerStats,
    upp_documents: uppStats,
  });
})().catch((error) => {
  console.error("Backfill failed", error);
  process.exit(1);
});
