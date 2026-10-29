import { Router } from "express";
import { createUsersController } from "./users.controller.js";
import type { UsersService } from "./users.service.js";

export function createUsersRouter(service: UsersService) {
  const router = Router();
  const controller = createUsersController(service);
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
