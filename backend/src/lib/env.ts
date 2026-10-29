import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default("127.0.0.1"),
  FRONTEND_ORIGIN: z
    .url()
    .refine((value) => new URL(value).origin === value, "Use an origin without a path."),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
});

export function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Report field names only: validation input may contain credentials.
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  }
  return result.data;
}
