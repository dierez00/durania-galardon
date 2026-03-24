import { createHmac } from "crypto";
import { getServerEnv } from "@/shared/config";
import type { SignedReemoPayload } from "../repositories/MovementRepository";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSigningKey(): string {
  return getServerEnv().supabaseServiceRoleKey;
}

export function signReemoPayload(payload: SignedReemoPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getSigningKey()).update(encodedPayload).digest("base64url");
  return `REEMO.${encodedPayload}.${signature}`;
}

export function verifyReemoPayload(token: string): SignedReemoPayload | null {
  const [prefix, encodedPayload, signature] = token.split(".");
  if (prefix !== "REEMO" || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSigningKey()).update(encodedPayload).digest("base64url");
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as SignedReemoPayload;
  } catch {
    return null;
  }
}
