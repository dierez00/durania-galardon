export type AuthFlowType = "invite" | "recovery";

export interface AuthCallbackState {
  type: AuthFlowType | null;
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

export function isSupportedAuthFlowType(value: string | null | undefined): value is AuthFlowType {
  return value === "invite" || value === "recovery";
}

export function parseAuthCallbackState(searchParams: URLSearchParams, hash: string): AuthCallbackState {
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const rawType = searchParams.get("type") ?? hashParams.get("type");

  return {
    type: isSupportedAuthFlowType(rawType) ? rawType : null,
    tokenHash: searchParams.get("token_hash") ?? hashParams.get("token_hash"),
    accessToken: hashParams.get("access_token") ?? searchParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") ?? searchParams.get("refresh_token"),
    errorCode: hashParams.get("error_code") ?? searchParams.get("error_code"),
    errorDescription:
      hashParams.get("error_description") ??
      searchParams.get("error_description") ??
      hashParams.get("error"),
  };
}
