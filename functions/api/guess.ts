import { getDataset, getTechById } from "../_lib/dataset";
import { evaluateGuess, isWinningRow } from "../_lib/evaluateGuess";
import type { Env } from "../_lib/env";
import { GUESS_RATE_LIMIT_PER_DAY } from "../_lib/gameConfig";
import { badRequest, jsonNoStore, serverError, tooManyRequests, unauthorized, safeJsonParse } from "../_lib/http";
import { enforceRateLimit, secondsUntilUtcMidnight } from "../_lib/rateLimit";
import { getDateStrUTC, selectAnswer } from "../_lib/selectAnswer";
import { signProgressToken, verifyProgressToken } from "../_lib/token";
import { guessBodySchema } from "../_lib/validate";

export const onRequestPost = async ({ env, request }: { env: Env; request: Request }) => {
  try {
    if (!env.SECRET_SALT) {
      return serverError("Missing SECRET_SALT.");
    }

    const parsedBody = await safeJsonParse<unknown>(request);
    const result = guessBodySchema.safeParse(parsedBody);
    if (!result.success) return badRequest("Invalid guess request body.");

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const dateStr = getDateStrUTC();
    const rate = await enforceRateLimit({
      env,
      key: `guess:${dateStr}:${ip}`,
      limit: GUESS_RATE_LIMIT_PER_DAY,
      ttlSeconds: secondsUntilUtcMidnight()
    });
    if (!rate.allowed) return tooManyRequests();

    let payload;
    try {
      payload = await verifyProgressToken(result.data.token, env.SECRET_SALT);
    } catch {
      return unauthorized("Invalid token.");
    }

    if (payload.roundId !== result.data.roundId) {
      return badRequest("Token round mismatch.");
    }
    if (payload.remaining <= 0) {
      return badRequest("No guesses remaining.");
    }
    if (payload.guessed.includes(result.data.guessId)) {
      return badRequest("Guess already submitted.");
    }

    const guess = getTechById(result.data.guessId);
    if (!guess) {
      return badRequest("Unknown guessId.");
    }

    const answer = await selectAnswer(
      {
        seed: payload.roundId,
        datasetVersion: env.DATASET_VERSION ?? "v1",
        secretSalt: env.SECRET_SALT
      },
      getDataset()
    );

    const row = evaluateGuess(guess, answer);
    const remaining = Math.max(0, payload.remaining - 1);
    const isSolved = guess.id === answer.id || isWinningRow(row);
    const isOver = isSolved || remaining === 0;

    const token = await signProgressToken(
      {
        roundId: payload.roundId,
        remaining,
        guessed: [...payload.guessed, guess.id],
        issuedAt: payload.issuedAt
      },
      env.SECRET_SALT
    );

    return jsonNoStore({
      row,
      state: {
        remaining,
        isSolved,
        isOver
      },
      token
    });
  } catch {
    return serverError();
  }
};
