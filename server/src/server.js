import app from "./app.js";
import env from "./config/env.js";
import connectDatabase, { disconnectDatabase } from "./config/database.js";
import { startArticleScheduler, stopArticleScheduler } from "./services/articleScheduler.js";
import { smtpConfigurationStatus } from "./config/smtp.js";

const startServer = async () => {
  try {
    // 1. Establish database connection before accepting traffic
    await connectDatabase();
    const emailStatus = smtpConfigurationStatus();
    if (!emailStatus.configured) console.warn(`[Email] Configuration incomplete: ${emailStatus.missing.join(", ")}.`);

    // 2. Start scheduled articles background publishing worker
    startArticleScheduler();

    // 3. Start HTTP listener
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Nsemra News API listening on http://localhost:${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Server] Allowed Frontend: ${env.FRONTEND_URL}`);
    });
    server.requestTimeout = 120000;
    server.headersTimeout = 15000;
    server.keepAliveTimeout = 5000;

    // 4. Graceful shutdown handler
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      stopArticleScheduler();
      server.close(async () => {
        console.log("[Server] HTTP server closed.");
        await disconnectDatabase();
        process.exit(0);
      });

      // Force exit if shutdown hangs
      setTimeout(() => {
        console.error("[Server] Forceful shutdown initiated after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (error) {
    console.error("[Server Fatal] Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
