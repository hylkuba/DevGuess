export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function jsonNoStore(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return json(data, { ...init, headers });
}

export function jsonCacheForDay(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "public, max-age=300, s-maxage=86400");
  return json(data, { ...init, headers });
}

export function badRequest(message: string): Response {
  return jsonNoStore({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized"): Response {
  return jsonNoStore({ error: message }, { status: 401 });
}

export function tooManyRequests(message = "Too many requests"): Response {
  return jsonNoStore({ error: message }, { status: 429 });
}

export function serverError(message = "Internal server error"): Response {
  return jsonNoStore({ error: message }, { status: 500 });
}

export async function safeJsonParse<T>(request: { json: () => Promise<unknown> }): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
