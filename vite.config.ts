import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { onRequestGet as catalogGet } from "./functions/api/catalog";
import { onRequestPost as guessPost } from "./functions/api/guess";
import { onRequestGet as metaGet } from "./functions/api/meta";
import { onRequestPost as searchPost } from "./functions/api/search";
import { onRequestPost as startPost } from "./functions/api/start";
import type { Env } from "./functions/_lib/env";

type Handler = (args: { env: Env; request: Request }) => Promise<Response> | Response;

type RouteHandlers = {
  GET?: Handler;
  POST?: Handler;
};

const ROUTES: Record<string, RouteHandlers> = {
  "/api/meta": { GET: metaGet },
  "/api/catalog": { GET: catalogGet },
  "/api/search": { POST: searchPost },
  "/api/start": { POST: startPost },
  "/api/guess": { POST: guessPost }
};

function parseDevVars(root: string): Record<string, string> {
  const varsPath = resolve(root, ".dev.vars");
  if (!existsSync(varsPath)) return {};

  const raw = readFileSync(varsPath, "utf8");
  const result: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) result[key] = value;
  }

  return result;
}

function createLocalEnv(root: string): Env {
  const vars = parseDevVars(root);
  return {
    SECRET_SALT: process.env.SECRET_SALT ?? vars.SECRET_SALT ?? "devguess-local-secret",
    DATASET_VERSION: process.env.DATASET_VERSION ?? vars.DATASET_VERSION ?? "v1",
    PUZZLE_EPOCH: process.env.PUZZLE_EPOCH ?? vars.PUZZLE_EPOCH ?? "2025-01-01"
  };
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

async function buildRequest(req: IncomingMessage): Promise<Request> {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const headers = toHeaders(req);
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);

  return new Request(url, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined
  });
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function localApiPlugin(): PluginOption {
  return {
    name: "local-pages-functions",
    apply: "serve",
    configureServer(server) {
      const env = createLocalEnv(server.config.root);

      server.middlewares.use(async (req, res, next) => {
        const method = (req.method ?? "GET").toUpperCase();
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        const handlers = ROUTES[pathname];

        if (!handlers) {
          next();
          return;
        }

        const handler = handlers[method as keyof RouteHandlers];
        if (!handler) {
          await sendResponse(res, jsonError(405, `Method ${method} not allowed.`));
          return;
        }

        try {
          const request = await buildRequest(req);
          const response = await handler({ env, request });
          await sendResponse(res, response);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unhandled API error.";
          await sendResponse(res, jsonError(500, message));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()]
});
