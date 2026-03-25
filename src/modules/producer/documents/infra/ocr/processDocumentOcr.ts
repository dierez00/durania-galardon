import { getServerEnv } from "@/shared/config";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

const OCR_TIMEOUT_MS = 300000;
const OCR_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type OcrDocumentType = "ine" | "curp";

type OcrUpdatePayload = {
  fullText: string | null;
  ocrText: string | null;
  ocrFields: Record<string, unknown> | null;
  ocrMetadata: Record<string, unknown>;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function buildOcrCandidateUrls(): string[] {
  const configured = getServerEnv().apiOcrUrl.trim();
  const urls = [configured];

  // Railway and some proxies can reject POST over plain HTTP; keep a safe HTTPS fallback.
  if (configured.startsWith("http://")) {
    urls.push(`https://${configured.slice("http://".length)}`);
  }

  return urls;
}

function getFileNameFromStorageKey(fileStorageKey: string): string {
  const parts = fileStorageKey.split("/");
  return parts[parts.length - 1] || `document-${Date.now()}.bin`;
}

function buildErrorMetadata(source: "upload" | "backfill", error: unknown) {
  return {
    status: "error",
    source,
    processed_at: new Date().toISOString(),
    error: {
      message: error instanceof Error ? error.message : "Error desconocido en OCR.",
    },
  };
}

function inferOcrDocumentType(
  documentTypeHint: string,
  fileName?: string
): { documentType: OcrDocumentType | null; strategy: string; input: string } {
  const normalized = `${documentTypeHint} ${fileName ?? ""}`.toLowerCase();

  if (normalized.includes("curp")) {
    return {
      documentType: "curp",
      strategy: "keyword-curp",
      input: normalized,
    };
  }

  if (normalized.includes("ine") || normalized.includes("elector") || normalized.includes("credencial")) {
    return {
      documentType: "ine",
      strategy: "keyword-ine",
      input: normalized,
    };
  }

  return {
    documentType: null,
    strategy: "skip-unclassified",
    input: normalized,
  };
}

async function requestOcrExtraction(
  file: File,
  documentTypeHint: string,
  source: "upload" | "backfill"
): Promise<OcrUpdatePayload> {
  const fileName = file.name || `document-${Date.now()}.bin`;
  const inferred = inferOcrDocumentType(documentTypeHint, fileName);

  if (!inferred.documentType) {
    return {
      fullText: null,
      ocrText: null,
      ocrFields: null,
      ocrMetadata: {
        ocr_processing: {
          source,
          status: "skipped",
          processed_at: new Date().toISOString(),
          inference_strategy: inferred.strategy,
          reason: "Document type could not be classified as INE/CURP",
        },
      },
    };
  }

  let lastError: Error | null = null;

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

      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
        fields?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      };

      if (!response.ok) {
        const message = body.detail ?? `OCR request failed with status ${response.status}.`;
        const shouldTryNext = response.status === 405 || response.status === 502 || response.status === 503 || response.status === 504;
        lastError = new Error(message);
        if (shouldTryNext) {
          continue;
        }
        throw lastError;
      }

      const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
      const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const fullTextValue = fields.full_text;
      const ocrText = typeof fullTextValue === "string" ? fullTextValue : null;

      return {
        fullText: ocrText,
        ocrText,
        ocrFields: Object.keys(fields).length > 0 ? fields : null,
        ocrMetadata: {
          ...metadata,
          ocr_processing: {
            source,
            status: "ok",
            processed_at: new Date().toISOString(),
            inferred_document_type: inferred.documentType,
            inference_strategy: inferred.strategy,
            endpoint_used: endpoint.origin,
          },
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("OCR request failed.");

      const lowerMessage = lastError.message.toLowerCase();
      const isTransientNetworkError =
        lowerMessage.includes("aborted") ||
        lowerMessage.includes("timeout") ||
        lowerMessage.includes("econn") ||
        lowerMessage.includes("fetch failed");

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

            const retryBody = (await retryResponse.json().catch(() => ({}))) as {
              detail?: string;
              fields?: Record<string, unknown>;
              metadata?: Record<string, unknown>;
            };

            if (!retryResponse.ok) {
              lastError = new Error(
                retryBody.detail ?? `OCR request failed with status ${retryResponse.status}.`
              );
              continue;
            }

            const retryFields =
              retryBody.fields && typeof retryBody.fields === "object" ? retryBody.fields : {};
            const retryMetadata =
              retryBody.metadata && typeof retryBody.metadata === "object" ? retryBody.metadata : {};
            const retryFullTextValue = retryFields.full_text;
            const retryOcrText = typeof retryFullTextValue === "string" ? retryFullTextValue : null;

            return {
              fullText: retryOcrText,
              ocrText: retryOcrText,
              ocrFields: Object.keys(retryFields).length > 0 ? retryFields : null,
              ocrMetadata: {
                ...retryMetadata,
                ocr_processing: {
                  source,
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
            lastError = retryError instanceof Error ? retryError : new Error("OCR retry failed.");
          } finally {
            clearTimeout(retryTimeout);
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("OCR request failed.");
}

export async function processProducerDocumentOcrInBackground(params: {
  documentId: string;
  file: File;
  documentTypeKey: string;
  source: "upload" | "backfill";
}): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const ocrResult = await requestOcrExtraction(params.file, params.documentTypeKey, params.source);

    const updateResult = await supabaseAdmin
      .from("producer_documents")
      .update({
        full_text: ocrResult.fullText,
        ocr_text: ocrResult.ocrText,
        ocr_fields: ocrResult.ocrFields,
        ocr_metadata: ocrResult.ocrMetadata,
        extracted_fields: ocrResult.ocrFields,
      })
      .eq("id", params.documentId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  } catch (error) {
    await supabaseAdmin
      .from("producer_documents")
      .update({ ocr_metadata: buildErrorMetadata(params.source, error) })
      .eq("id", params.documentId);
  }
}

export async function processUppDocumentOcrInBackground(params: {
  documentId: string;
  file: File;
  documentType: string;
  source: "upload" | "backfill";
}): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const ocrResult = await requestOcrExtraction(params.file, params.documentType, params.source);

    const updateResult = await supabaseAdmin
      .from("upp_documents")
      .update({
        full_text: ocrResult.fullText,
        ocr_text: ocrResult.ocrText,
        ocr_fields: ocrResult.ocrFields,
        ocr_metadata: ocrResult.ocrMetadata,
      })
      .eq("id", params.documentId);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }
  } catch (error) {
    await supabaseAdmin
      .from("upp_documents")
      .update({ ocr_metadata: buildErrorMetadata(params.source, error) })
      .eq("id", params.documentId);
  }
}

export async function processDocumentFromStorageBackfill(params: {
  table: "producer_documents" | "upp_documents";
  id: string;
  fileStorageKey: string;
  documentTypeHint: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabaseAdmin = getSupabaseAdminClient();
  const downloadResult = await supabaseAdmin.storage
    .from("Documents_producer")
    .download(params.fileStorageKey);

  if (downloadResult.error || !downloadResult.data) {
    const message = downloadResult.error?.message ?? "No fue posible descargar el archivo desde storage.";
    return { ok: false, error: message };
  }

  const file = new File([downloadResult.data], getFileNameFromStorageKey(params.fileStorageKey), {
    type: downloadResult.data.type || "application/octet-stream",
  });

  if (params.table === "producer_documents") {
    await processProducerDocumentOcrInBackground({
      documentId: params.id,
      file,
      documentTypeKey: params.documentTypeHint,
      source: "backfill",
    });
  } else {
    await processUppDocumentOcrInBackground({
      documentId: params.id,
      file,
      documentType: params.documentTypeHint,
      source: "backfill",
    });
  }

  return { ok: true };
}
