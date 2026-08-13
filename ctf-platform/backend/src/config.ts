import "dotenv/config";

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",

  // Database
  databaseUrl: process.env.DATABASE_URL || "postgresql://ctf_admin:ctf_password@localhost:5432/ctf",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production-please",
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  // Rate Limiting (requests per window)
  rateLimits: {
    auth: { max: 5, windowSeconds: 60 },         // 5 per minute
    submission: { max: 6, windowSeconds: 60 },    // 6 per minute
    general: { max: 60, windowSeconds: 60 },      // 60 per minute
  },
} as const;
