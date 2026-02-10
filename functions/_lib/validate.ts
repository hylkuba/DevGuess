import { z } from "zod";

export const searchBodySchema = z.object({
  q: z.string().trim().min(1).max(80)
});

export const startBodySchema = z.object({}).strict();

export const guessBodySchema = z.object({
  roundId: z.string().regex(/^[a-f0-9]{32}$/),
  guessId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  token: z.string().min(20)
});
