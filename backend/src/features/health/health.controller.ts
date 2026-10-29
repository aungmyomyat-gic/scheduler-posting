import type { Request, Response } from "express";
import { healthDataSchema } from "../../contracts/health.js";
import { sendSuccess } from "../../lib/response.js";

export function getHealth(_request: Request, response: Response) {
  sendSuccess(response, healthDataSchema, { status: "ok" }, "API is running.");
}
