export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Sin registro";
  }

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Sin registro";
  }

  return new Date(value).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBool(value: boolean | null): string {
  if (value === null) {
    return "—";
  }

  return value ? "Sí" : "No";
}

export function formatStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return "Sin dato";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}
