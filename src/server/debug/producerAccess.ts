const SERVER_PREFIX = "[producer-debug][server]";
const MAX_SAMPLE_SIZE = 5;

type ProducerAccessDebugEnv = Record<string, string | undefined>;

export function resolveProducerAccessDebugEnabled(
  env: ProducerAccessDebugEnv = process.env
): boolean {
  return env.DEBUG_PRODUCER_ACCESS === "1" || env.NEXT_PUBLIC_DEBUG_PRODUCER_ACCESS === "1";
}

export function isProducerAccessDebugEnabled(): boolean {
  return resolveProducerAccessDebugEnabled(process.env);
}

export function sampleProducerAccessIds(
  ids: readonly string[] | null | undefined
): { count: number; sample: string[] } {
  const safeIds = (ids ?? []).filter(Boolean);
  return {
    count: safeIds.length,
    sample: safeIds.slice(0, MAX_SAMPLE_SIZE),
  };
}

export function summarizeProducerAccessError(error: unknown): Record<string, string> | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const summary: Record<string, string> = {};

    if (typeof candidate.code === "string") {
      summary.code = candidate.code;
    }
    if (typeof candidate.message === "string") {
      summary.message = candidate.message;
    }
    if (typeof candidate.details === "string") {
      summary.details = candidate.details;
    }
    if (typeof candidate.hint === "string") {
      summary.hint = candidate.hint;
    }
    if (typeof candidate.name === "string") {
      summary.name = candidate.name;
    }

    return Object.keys(summary).length > 0 ? summary : { value: String(error) };
  }

  return { value: String(error) };
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_SAMPLE_SIZE).map((item) => sanitizeValue(item, depth + 1));
  }

  if (value instanceof Error) {
    return summarizeProducerAccessError(value);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 25);
    return Object.fromEntries(
      entries.map(([key, nested]) => [
        key,
        depth >= 2 ? String(nested) : sanitizeValue(nested, depth + 1),
      ])
    );
  }

  return String(value);
}

export function logProducerAccessServer(
  event: string,
  payload?: Record<string, unknown>
): void {
  if (!isProducerAccessDebugEnabled()) {
    return;
  }

  console.info(`${SERVER_PREFIX} ${event}`, sanitizeValue(payload ?? {}));
}
