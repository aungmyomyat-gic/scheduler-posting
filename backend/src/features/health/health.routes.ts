import { Router } from "express";
import { getHealth } from "./health.controller.js";

export function createHealthRouter() {
  const router = Router();
  router.get("/", getHealth);
  return router;
}
