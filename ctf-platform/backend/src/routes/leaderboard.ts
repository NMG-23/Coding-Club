import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import {
  getTopUsers,
  getTopTeams,
  getUserRank,
  getTeamRank,
  getUserScore,
  getTeamScore,
  getFrozenLeaderboard,
} from "../services/leaderboard";
import { isLeaderboardFrozen } from "../services/event.service";
import { db } from "../db";
import { users, teams } from "../db/schema";
import { eq } from "drizzle-orm";
import type { AuthContext } from "../utils/types";

/**
 * Enrich leaderboard entries with usernames/team names.
 */
async function enrichUserLeaderboard(entries: { id: string; score: number }[]) {
  const enriched = [];
  for (const entry of entries) {
    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, entry.id));

    enriched.push({
      id: entry.id,
      username: user?.username || "Unknown",
      score: entry.score,
      rank: enriched.length + 1,
    });
  }
  return enriched;
}

async function enrichTeamLeaderboard(entries: { id: string; score: number }[]) {
  const enriched = [];
  for (const entry of entries) {
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, entry.id));

    enriched.push({
      id: entry.id,
      name: team?.name || "Unknown",
      score: entry.score,
      rank: enriched.length + 1,
    });
  }
  return enriched;
}

export const leaderboardRoutes = new Elysia({ prefix: "/leaderboard" })
  .use(rateLimiter())

  // ─── Top Users ───────────────────────────────────────────────────────────
  .get("/users", async (ctx: any) => {
    const query = ctx.query as { limit?: string };
    const limit = parseInt(query.limit || "50");

    // Check if leaderboard is frozen
    const { frozen, eventId } = await isLeaderboardFrozen();

    if (frozen && eventId) {
      const snapshot = await getFrozenLeaderboard();
      if (snapshot && typeof snapshot === "object" && "users" in (snapshot as any)) {
        return {
          success: true,
          data: (snapshot as any).users,
          frozen: true,
        };
      }
    }

    const topUsers = await getTopUsers(limit);
    const enriched = await enrichUserLeaderboard(topUsers);

    return { success: true, data: enriched, frozen: false };
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  })

  // ─── Top Teams ───────────────────────────────────────────────────────────
  .get("/teams", async (ctx: any) => {
    const query = ctx.query as { limit?: string };
    const limit = parseInt(query.limit || "50");

    const { frozen, eventId } = await isLeaderboardFrozen();

    if (frozen && eventId) {
      const snapshot = await getFrozenLeaderboard();
      if (snapshot && typeof snapshot === "object" && "teams" in (snapshot as any)) {
        return {
          success: true,
          data: (snapshot as any).teams,
          frozen: true,
        };
      }
    }

    const topTeams = await getTopTeams(limit);
    const enriched = await enrichTeamLeaderboard(topTeams);

    return { success: true, data: enriched, frozen: false };
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  })

  // ─── My Rank ─────────────────────────────────────────────────────────────
  .use(authMiddleware)
  .get("/me", async (ctx: any) => {
    const { user } = ctx as unknown as AuthContext;
    const rank = await getUserRank(user.id);
    const score = await getUserScore(user.id);

    let teamRank = null;
    let teamScore = null;

    if (user.teamId) {
      teamRank = await getTeamRank(user.teamId);
      teamScore = await getTeamScore(user.teamId);
    }

    return {
      success: true,
      data: {
        user: { rank, score },
        team: user.teamId ? { rank: teamRank, score: teamScore } : null,
      },
    };
  });
