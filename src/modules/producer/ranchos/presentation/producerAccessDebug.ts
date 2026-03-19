const CLIENT_PREFIX = "[producer-debug][client]";
const MAX_SAMPLE_SIZE = 5;

export function isProducerAccessClientDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEBUG_PRODUCER_ACCESS === "1";
}

export function sampleProducerAccessClientIds(
  ids: readonly string[] | null | undefined
): { count: number; sample: string[] } {
  const safeIds = (ids ?? []).filter(Boolean);
  return {
    count: safeIds.length,
    sample: safeIds.slice(0, MAX_SAMPLE_SIZE),
  };
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
    return {
      name: value.name,
      message: value.message,
    };
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

export function logProducerAccessClient(
  event: string,
  payload?: Record<string, unknown>
): void {
  if (!isProducerAccessClientDebugEnabled()) {
    return;
  }

  console.info(`${CLIENT_PREFIX} ${event}`, sanitizeValue(payload ?? {}));
}
