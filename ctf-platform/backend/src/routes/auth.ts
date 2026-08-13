import { Elysia, t } from "elysia";
import { rateLimiter } from "../middleware/rateLimit";
import { authMiddleware } from "../middleware/auth";
import {
  registerUser,
  loginUser,
  generateTokens,
  verifyToken,
  blacklistToken,
} from "../services/auth.service";

// Type for the auth context injected by authMiddleware
interface AuthContext {
  user: { id: string; username: string; role: string; teamId: string | null };
  token: string;
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(rateLimiter())

  // ─── Register ────────────────────────────────────────────────────────────
  .post(
    "/register",
    async (ctx: any) => {
      const { username, email, password } = ctx.body;
      const user = await registerUser(username, email, password);
      const tokens = await generateTokens(user.id, user.role!);

      return {
        success: true,
        data: {
          user: { id: user.id, username: user.username, role: user.role },
          ...tokens,
        },
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 32 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8, maxLength: 128 }),
      }),
    }
  )

  // ─── Login ───────────────────────────────────────────────────────────────
  .post(
    "/login",
    async (ctx: any) => {
      const { username, password } = ctx.body;
      const user = await loginUser(username, password);
      const tokens = await generateTokens(user.id, user.role!);

      return {
        success: true,
        data: {
          user,
          ...tokens,
        },
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )

  // ─── Check Session ───────────────────────────────────────────────────────
  .post(
    "/check-session",
    async (ctx: any) => {
      const { refreshToken } = ctx.body;
      const payload = await verifyToken(refreshToken);

      if (payload.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      const tokens = await generateTokens(payload.sub, payload.role || "player");

      // Blacklist the old refresh token
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await blacklistToken(refreshToken, ttl);
      }

      return {
        success: true,
        data: tokens,
      };
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
    }
  )

  // ─── Protected Routes ────────────────────────────────────────────────────
  .group("", (app) =>
    app
      .use(authMiddleware)
      .post("/logout", async (ctx: any) => {
        const { token } = ctx as unknown as AuthContext;
        // Blacklist the access token for its remaining TTL
        const payload = await verifyToken(token);
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await blacklistToken(token, ttl);
        }

        return { success: true, message: "Logged out successfully" };
      })

      // ─── Get Current User ────────────────────────────────────────────────────
      .get("/me", async (ctx: any) => {
        const { user } = ctx as unknown as AuthContext;
        return {
          success: true,
          data: user,
        };
      })
  );
