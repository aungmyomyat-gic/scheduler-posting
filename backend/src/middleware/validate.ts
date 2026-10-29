import { z } from "zod";
import { AppError } from "../lib/app-error.js";

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "_form";
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  throw new AppError(422, "VALIDATION_ERROR", "Please check the highlighted fields.", fieldErrors);
}
