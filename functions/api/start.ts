import { getDataset } from "../_lib/dataset";
import type { Env } from "../_lib/env";
import { MAX_GUESSES } from "../_lib/gameConfig";
import { buildKeywordHint } from "../_lib/keywordHint";
import { badRequest, jsonNoStore, serverError, safeJsonParse } from "../_lib/http";
import { selectAnswer } from "../_lib/selectAnswer";
import { signProgressToken } from "../_lib/token";
import { startBodySchema } from "../_lib/validate";

function createRoundId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export const onRequestPost = async ({ env, request }: { env: Env; request: Request }) => {
  try {
    if (!env.SECRET_SALT) {
      return serverError("Missing SECRET_SALT.");
    }

    const parsedBody = await safeJsonParse<unknown>(request);
    if (parsedBody !== null) {
      const result = startBodySchema.safeParse(parsedBody);
      if (!result.success) return badRequest("Invalid start request body.");
    }

    const roundId = createRoundId();
    const answer = await selectAnswer(
      {
        seed: roundId,
        datasetVersion: env.DATASET_VERSION ?? "v1",
        secretSalt: env.SECRET_SALT
      },
      getDataset()
    );

    const token = await signProgressToken(
      {
        roundId,
        remaining: MAX_GUESSES,
        guessed: [],
        issuedAt: Math.floor(Date.now() / 1000)
      },
      env.SECRET_SALT
    );

    return jsonNoStore({
      roundId,
      token,
      maxGuesses: MAX_GUESSES,
      hint: buildKeywordHint(answer)
    });
  } catch {
    return serverError();
  }
};
