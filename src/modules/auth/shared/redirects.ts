import { publicEnv } from "@/shared/config";

const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}

export function getPublicSiteUrl() {
  return normalizeBaseUrl(publicEnv.siteUrl ?? FALLBACK_SITE_URL);
}

export function buildAppUrl(
  pathname: string,
  query?: Record<string, string | null | undefined>
) {
  const url = new URL(pathname, getPublicSiteUrl());

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    url.searchParams.set(key, value);
  });

  return url.toString();
}

export function buildSetPasswordRedirectUrl() {
  return buildAppUrl("/auth/set-password");
}
