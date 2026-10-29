import express from "express";
import cors from "cors";
import { z } from "zod";
import { createUsersRouter } from "./features/users/users.routes.js";
import type { UsersService } from "./features/users/users.service.js";
import { AppError } from "./lib/app-error.js";
import { sendSuccess } from "./lib/response.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export function createApp(options: { usersService: UsersService; frontendOrigin: string }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === options.frontendOrigin) return callback(null, true);
        callback(new AppError(403, "FORBIDDEN", "This origin is not allowed."));
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      exposedHeaders: ["X-Request-ID"],
    }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/v1/health", (_request, response) => {
    sendSuccess(
      response,
      z.strictObject({ status: z.literal("ok") }),
      { status: "ok" },
      "API is running.",
    );
  });
  app.use("/api/v1/users", createUsersRouter(options.usersService));
  app.use((_request, _response, next) =>
    next(new AppError(404, "NOT_FOUND", "API route not found.")),
  );
  app.use(errorHandler);
  return app;
}
