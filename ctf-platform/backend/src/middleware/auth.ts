import { Elysia } from "elysia";
import { verifyToken, isTokenBlacklisted } from "../services/auth.service";
import { UnauthorizedError, BannedError } from "../utils/errors";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * checks blacklist, and attaches user info to the request context.
 */
export const authMiddleware = (app: Elysia) => 
  app.derive(async ({ headers }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AuthMiddleware] Missing auth header. Throwing 401.");
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);

    // Check if token has been blacklisted (logged out)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new UnauthorizedError("Token has been revoked");
    }

    const payload = await verifyToken(token);

    if (payload.type !== "access") {
      throw new UnauthorizedError("Invalid token type");
    }

    // Fetch fresh user data to check ban status
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        teamId: users.teamId,
        isBanned: users.isBanned,
      })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (user.isBanned) {
      throw new BannedError();
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        teamId: user.teamId,
      },
      token,
    };
  });
