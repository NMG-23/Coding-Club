import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { rebuildLeaderboard } from "./services/leaderboard";
import { AppError } from "./utils/errors";

// Routes
import { authRoutes } from "./routes/auth";
import { challengeRoutes } from "./routes/challenges";
import { submissionRoutes } from "./routes/submissions";
import { leaderboardRoutes } from "./routes/leaderboard";
import { teamRoutes } from "./routes/teams";
import { adminRoutes } from "./routes/admin";
import { userRoutes } from "./routes/users";

// WebSocket
import { wsLeaderboard } from "./ws/leaderboard";

// ─── Initialize Application ─────────────────────────────────────────────────

const app = new Elysia()
  // ─── Global Middleware ─────────────────────────────────────────────────
  .use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )

  // ─── Global Error Handler ─────────────────────────────────────────────
  .onError(({ error, set }) => {
    const err = error as any;

    if (err instanceof AppError) {
      set.status = err.statusCode;
      return {
        success: false,
        error: {
          message: err.message,
          code: err.code,
        },
      };
    }

    // Elysia validation errors
    if (err.message?.includes("Expected")) {
      set.status = 400;
      return {
        success: false,
        error: {
          message: "Validation error: " + err.message,
          code: "VALIDATION_ERROR",
        },
      };
    }

    // Unexpected errors
    console.error("[Server] Unhandled error:", error);
    set.status = 500;
    return {
      success: false,
      error: {
        message: config.env === "production" ? "Internal server error" : String(error),
        code: "INTERNAL_ERROR",
      },
    };
  })

  // ─── Health Check ─────────────────────────────────────────────────────
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

  // ─── API Routes ───────────────────────────────────────────────────────
  .group("/api", (app) =>
    app
      .use(authRoutes)
      .use(challengeRoutes)
      .use(submissionRoutes)
      .use(leaderboardRoutes)
      .use(teamRoutes)
      .use(adminRoutes)
      .use(userRoutes)
  )

  // ─── WebSocket ────────────────────────────────────────────────────────
  .use(wsLeaderboard);

// ─── Start Server ────────────────────────────────────────────────────────────

async function start() {
  try {
    // Rebuild leaderboard from SQLite (cold start recovery)
    await rebuildLeaderboard();

    // Start the server
    app.listen(config.port);

    console.log(`
╔══════════════════════════════════════════════════╗
║          🚩 CTF Platform Server                  ║
║──────────────────────────────────────────────────║
║  Status:    RUNNING                              ║
║  Port:      ${String(config.port).padEnd(37)}║
║  Env:       ${config.env.padEnd(37)}║
║  WebSocket: ws://localhost:${config.port}/ws/leaderboard     ║
║  API:       http://localhost:${config.port}/api              ║
╚══════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

start();
