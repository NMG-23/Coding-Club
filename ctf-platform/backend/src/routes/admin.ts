import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { adminMiddleware } from "../middleware/admin";
import { db } from "../db";
import { challenges, events, users, submissions } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { freezeLeaderboard, rebuildLeaderboard } from "../services/leaderboard";
import { ForbiddenError, NotFoundError } from "../utils/errors";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authMiddleware)
  .use(adminMiddleware)

  // ─── Toggle Challenge Visibility ─────────────────────────────────────────
  .patch(
    "/challenges/:id/toggle",
    async ({ params }) => {
      const [challenge] = await db
        .select({ id: challenges.id, isActive: challenges.isActive })
        .from(challenges)
        .where(eq(challenges.id, params.id));

      if (!challenge) throw new NotFoundError("Challenge");

      const [updated] = await db
        .update(challenges)
        .set({ isActive: !challenge.isActive })
        .where(eq(challenges.id, params.id))
        .returning({ id: challenges.id, isActive: challenges.isActive, title: challenges.title });

      return {
        success: true,
        data: updated,
        message: `Challenge "${updated.title}" is now ${updated.isActive ? "visible" : "hidden"}`,
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ─── Event Control: Start Event ──────────────────────────────────────────
  .post(
    "/events",
    async ({ body }) => {
      // Deactivate all existing events first
      await db.update(events).set({ isActive: false });

      const [event] = await db
        .insert(events)
        .values({
          name: body.name,
          description: body.description,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          scoreboardFreezeTime: body.freezeTime ? new Date(body.freezeTime) : null,
          isActive: true,
        })
        .returning();

      return { success: true, data: event };
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        startTime: t.String(), // ISO datetime
        endTime: t.String(),
        freezeTime: t.Optional(t.String()),
      }),
    }
  )

  // ─── Event Control: Freeze Scoreboard Now ────────────────────────────────
  .post("/events/:id/freeze", async ({ params }) => {
    await freezeLeaderboard(params.id);
    return { success: true, message: "Leaderboard frozen successfully" };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ─── Event Control: End Event ────────────────────────────────────────────
  .post("/events/:id/end", async ({ params }) => {
    await db
      .update(events)
      .set({ endTime: new Date(), isActive: false })
      .where(eq(events.id, params.id));

    return { success: true, message: "Event ended" };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ─── Ban / Unban User ────────────────────────────────────────────────────
  .patch(
    "/users/:id/ban",
    async ({ params }) => {
      const [user] = await db
        .select({ id: users.id, isBanned: users.isBanned, role: users.role })
        .from(users)
        .where(eq(users.id, params.id));

      if (!user) throw new NotFoundError("User");
      if (user.role === "admin") throw new ForbiddenError("Cannot ban an admin");

      const [updated] = await db
        .update(users)
        .set({ isBanned: !user.isBanned })
        .where(eq(users.id, params.id))
        .returning({ id: users.id, username: users.username, isBanned: users.isBanned });

      // Rebuild leaderboard to exclude/include banned user
      await rebuildLeaderboard();

      return {
        success: true,
        data: updated,
        message: `User ${updated.username} has been ${updated.isBanned ? "banned" : "unbanned"}`,
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ─── Submission Audit Log ────────────────────────────────────────────────
  .get("/submissions", async ({ query }) => {
    const limit = parseInt(query.limit || "100");
    const offset = parseInt(query.offset || "0");

    const auditLog = await db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        username: users.username,
        challengeId: submissions.challengeId,
        challengeTitle: challenges.title,
        submittedFlag: submissions.submittedFlag,
        isCorrect: submissions.isCorrect,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .innerJoin(challenges, eq(submissions.challengeId, challenges.id))
      .orderBy(desc(submissions.submittedAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: auditLog };
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  })

  // ─── List All Challenges (including inactive) ────────────────────────────
  .get("/challenges", async () => {
    const allChallenges = await db
      .select()
      .from(challenges)
      .orderBy(challenges.category, challenges.createdAt);

    return { success: true, data: allChallenges };
  })

  // ─── Get Active Event ────────────────────────────────────────────────────
  .get("/events/active", async () => {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true));

    return { success: true, data: event || null };
  })

  // ─── Force Leaderboard Rebuild ───────────────────────────────────────────
  .post("/leaderboard/rebuild", async () => {
    await rebuildLeaderboard();
    return { success: true, message: "Leaderboard rebuilt from database" };
  });
