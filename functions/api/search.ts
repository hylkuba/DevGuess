import { searchTech } from "../_lib/dataset";
import type { Env } from "../_lib/env";
import { SEARCH_LIMIT, SEARCH_RATE_LIMIT_PER_DAY } from "../_lib/gameConfig";
import { badRequest, jsonNoStore, serverError, tooManyRequests, safeJsonParse } from "../_lib/http";
import { enforceRateLimit, secondsUntilUtcMidnight } from "../_lib/rateLimit";
import { getDateStrUTC } from "../_lib/selectAnswer";
import { searchBodySchema } from "../_lib/validate";

export const onRequestPost = async ({ env, request }: { env: Env; request: Request }) => {
  try {
    const parsedBody = await safeJsonParse<unknown>(request);
    const result = searchBodySchema.safeParse(parsedBody);
    if (!result.success) return badRequest("Invalid search request body.");

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const dateStr = getDateStrUTC();
    const rate = await enforceRateLimit({
      env,
      key: `search:${dateStr}:${ip}`,
      limit: SEARCH_RATE_LIMIT_PER_DAY,
      ttlSeconds: secondsUntilUtcMidnight()
    });

    if (!rate.allowed) return tooManyRequests();

    const matches = searchTech(result.data.q, SEARCH_LIMIT).map((entry) => ({
      id: entry.id,
      name: entry.name,
      kindHint: entry.kindPath[0]
    }));

    return jsonNoStore({ results: matches });
  } catch {
    return serverError();
  }
};
