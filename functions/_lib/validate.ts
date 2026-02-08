import { z } from "zod";

export const searchBodySchema = z.object({
  q: z.string().trim().min(1).max(80)
});

export const startBodySchema = z.object({
  puzzleId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const guessBodySchema = z.object({
  puzzleId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guessId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  token: z.string().min(20)
});

