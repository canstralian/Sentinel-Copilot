import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { logger, createRequestLogger } from "./logger";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

logger.startup("Initializing SecureCopilot server", {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || "development",
  pid: process.pid,
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  logger.info(source.toUpperCase(), message);
}

app.use(createRequestLogger());

(async () => {
  logger.startup("Seeding database...");
  const seedStart = Date.now();
  await seedDatabase();
  logger.performance("Database seeding", Date.now() - seedStart);

  logger.startup("Registering API routes...");
  await registerRoutes(httpServer, app);
  logger.startup("API routes registered successfully");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("EXPRESS", "Unhandled error", {
      status,
      message,
      stack: err.stack,
    });

    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    logger.startup("Setting up static file serving for production");
    serveStatic(app);
  } else {
    logger.startup("Setting up Vite dev server for development");
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.startup("Server started successfully", {
        port,
        host: "0.0.0.0",
        url: `http://localhost:${port}`,
      });
    },
  );
})();
