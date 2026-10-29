import express from "express";
import cors from "cors";
import { createCorsConfig } from "./config/cors.config.js";
import { createHealthRouter } from "./features/health/health.routes.js";
import { createUsersRouter } from "./features/users/users.routes.js";
import type { UsersService } from "./features/users/users.service.js";
import { AppError } from "./lib/app-error.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export function createApp(options: { usersService: UsersService; frontendOrigin: string }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(cors(createCorsConfig(options.frontendOrigin)));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api/v1/health", createHealthRouter());
  app.use("/api/v1/users", createUsersRouter(options.usersService));
  app.use((_request, _response, next) =>
    next(new AppError(404, "NOT_FOUND", "API route not found.")),
  );
  app.use(errorHandler);
  return app;
}
