import type { Env } from "../_lib/env";
import { MAX_GUESSES } from "../_lib/gameConfig";
import { badRequest, jsonNoStore, serverError, safeJsonParse } from "../_lib/http";
import { getDateStrUTC } from "../_lib/selectAnswer";
import { signProgressToken } from "../_lib/token";
import { startBodySchema } from "../_lib/validate";

export const onRequestPost = async ({ env, request }: { env: Env; request: Request }) => {
  try {
    if (!env.SECRET_SALT) {
      return serverError("Missing SECRET_SALT.");
    }

    const parsedBody = await safeJsonParse<unknown>(request);
    const result = startBodySchema.safeParse(parsedBody);
    if (!result.success) return badRequest("Invalid start request body.");

    const puzzleId = getDateStrUTC();
    if (result.data.puzzleId !== puzzleId) {
      return badRequest(`Invalid puzzleId. Expected ${puzzleId}.`);
    }

    const token = await signProgressToken(
      {
        puzzleId,
        remaining: MAX_GUESSES,
        guessed: [],
        issuedAt: Math.floor(Date.now() / 1000)
      },
      env.SECRET_SALT
    );

    return jsonNoStore({
      token,
      maxGuesses: MAX_GUESSES
    });
  } catch {
    return serverError();
  }
};
