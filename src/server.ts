import "dotenv/config";
import app from "./app";
import config from "./app/config";
import { prisma, disconnectPrisma } from "./app/lib/prisma";

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✓ Connected to the database");
  } catch (error) {
    console.error("✗ Failed to connect to the database", error);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`✓ Server is running on port ${config.port} (${config.env})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectPrisma();
      console.log("✓ Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer();