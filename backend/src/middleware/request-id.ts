import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (_request, response, next) => {
  // Generate IDs on the server rather than trusting arbitrary client values.
  response.setHeader("X-Request-ID", randomUUID());
  next();
};
