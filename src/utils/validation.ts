export function ensureString(value: any, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`El campo ${fieldName} es obligatorio y debe ser string`);
  }
  return value.trim();
}

export function optionalString(value: any): string | undefined {
  if (value == null) return undefined;
  const str = String(value).trim();
  return str || undefined;
}

export function optionalNumber(value: any): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}
