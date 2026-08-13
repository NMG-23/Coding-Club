import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import { db } from "../db";
import { users, solves } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { getUserRank, getUserScore } from "../services/leaderboard";
import type { AuthContext } from "../utils/types";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(rateLimiter())

  // ─── Get User Profile ────────────────────────────────────────────────────
  .get("/me", async (ctx) => {
    const { user } = ctx as unknown as AuthContext;

    const [profile] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        teamId: users.teamId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id));

    const [solveStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(solves)
      .where(eq(solves.userId, user.id));

    const rank = await getUserRank(user.id);
    const score = await getUserScore(user.id);

    return {
      success: true,
      data: {
        ...profile,
        stats: {
          solveCount: solveStats?.count ?? 0,
          rank,
          score,
        },
      },
    };
  })

  // ─── Get Public Profile ──────────────────────────────────────────────────
  .get("/:id", async (ctx: any) => {
    const params = (ctx as any).params as { id: string };

    const [profile] = await db
      .select({
        id: users.id,
        username: users.username,
        teamId: users.teamId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, params.id));

    if (!profile) {
      return { success: false, error: "User not found" };
    }

    const [solveStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(solves)
      .where(eq(solves.userId, params.id));

    const rank = await getUserRank(params.id);
    const score = await getUserScore(params.id);

    return {
      success: true,
      data: {
        ...profile,
        stats: {
          solveCount: solveStats?.count ?? 0,
          rank,
          score,
        },
      },
    };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  });
