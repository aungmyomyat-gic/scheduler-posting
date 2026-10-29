import { createApp } from "./app.js";
import { loadEnv } from "./lib/env.js";
import { createDatabase } from "./lib/database.js";
import { createUsersService } from "./features/users/users.service.js";

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const app = createApp({
  usersService: createUsersService(database),
  frontendOrigin: env.FRONTEND_ORIGIN,
});
const server = app.listen(env.PORT, env.HOST, () => {
  console.info(`API ready at http://${env.HOST}:${env.PORT}/api/v1`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close(() => {
    void database
      .$disconnect()
      .then(() => {
        clearTimeout(timeout);
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
server.on("error", (error) => {
  console.error({
    errorName: error.name,
    message: "API could not start. Check the configured host and port.",
  });
  void database.$disconnect().finally(() => process.exit(1));
});
