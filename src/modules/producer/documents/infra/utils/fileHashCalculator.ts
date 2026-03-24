export async function calculateFileHash(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("calculateFileHash can only be used in browser environment");
  }

  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}
