import { base64UrlToBytes, bytesToBase64Url, bytesToUtf8, constantTimeEqual, hmacSha256, utf8ToBytes } from "./crypto";

export type ProgressTokenPayload = {
  roundId: string;
  remaining: number;
  guessed: string[];
  issuedAt: number;
};

const TOKEN_VERSION = "v2";

export async function signProgressToken(payload: ProgressTokenPayload, secret: string): Promise<string> {
  const encodedPayload = bytesToBase64Url(utf8ToBytes(JSON.stringify(payload)));
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = bytesToBase64Url(await hmacSha256(secret, signingInput));
  return `${signingInput}.${signature}`;
}

export async function verifyProgressToken(token: string, secret: string): Promise<ProgressTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format.");
  }

  const [version, payloadEncoded, signatureEncoded] = parts;
  if (version !== TOKEN_VERSION) {
    throw new Error("Unsupported token version.");
  }

  const signingInput = `${version}.${payloadEncoded}`;
  const expectedSig = await hmacSha256(secret, signingInput);
  const receivedSig = base64UrlToBytes(signatureEncoded);

  if (!constantTimeEqual(expectedSig, receivedSig)) {
    throw new Error("Invalid token signature.");
  }

  const payloadBytes = base64UrlToBytes(payloadEncoded);
  const payload = JSON.parse(bytesToUtf8(payloadBytes)) as ProgressTokenPayload;

  if (
    typeof payload.roundId !== "string" ||
    typeof payload.remaining !== "number" ||
    !Array.isArray(payload.guessed) ||
    typeof payload.issuedAt !== "number"
  ) {
    throw new Error("Invalid token payload.");
  }

  return payload;
}
