import type { CorsOptions } from "cors";
import { AppError } from "../lib/app-error.js";

export function createCorsConfig(frontendOrigin: string): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin || origin === frontendOrigin) return callback(null, true);
      callback(new AppError(403, "FORBIDDEN", "This origin is not allowed."));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    exposedHeaders: ["X-Request-ID"],
  };
}
