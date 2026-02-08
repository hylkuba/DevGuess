const encoder = new TextEncoder();

function getCryptoApi(): Crypto {
  if (globalThis.crypto) return globalThis.crypto;
  throw new Error("Crypto API is not available in this runtime.");
}

export async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const cryptoApi = getCryptoApi();
  const key = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await cryptoApi.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }

  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function utf8ToBytes(value: string): Uint8Array {
  return encoder.encode(value);
}

export function bytesToUtf8(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

