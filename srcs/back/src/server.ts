import { app } from "./app";
import { env } from "./env";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  console.log(`API a correr em http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
