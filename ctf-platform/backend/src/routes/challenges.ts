import { Elysia, t } from "elysia";
import { db } from "../db";
import { challenges, solves } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import { getActiveEvent, getEventState } from "../services/event.service";
import { getChallengePoints } from "../services/submission.service";
import { NotFoundError, EventStateError } from "../utils/errors";
import type { AuthContext } from "../utils/types";

export const challengeRoutes = new Elysia({ prefix: "/challenges" })
  .use(rateLimiter())
  .use(authMiddleware)

  // ─── List All Active Challenges ──────────────────────────────────────────
  .get("/", async ({ user }) => {
    
    // Check if event has started
    const event = await getActiveEvent();
    if (event) {
      const state = getEventState(event);
      if (state === "pre-event") {
        throw new EventStateError("Challenges will be revealed when the event starts");
      }
    }

    const result = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        category: challenges.category,
        difficulty: challenges.difficulty,
        initialPoints: challenges.initialPoints,
        minPoints: challenges.minPoints,
        decay: challenges.decay,
        solveCount: challenges.solveCount,
        authorName: challenges.authorName,
      })
      .from(challenges)
      .where(eq(challenges.isActive, true))
      .orderBy(challenges.category, challenges.difficulty);

    // Enrich with dynamic point values and user solve status
    const userSolves = await db
      .select({ challengeId: solves.challengeId })
      .from(solves)
      .where(eq(solves.userId, user.id));

    const solvedIds = new Set(userSolves.map((s) => s.challengeId));

    const enriched = result.map((c) => ({
      ...c,
      currentPoints: getChallengePoints(c),
      solved: solvedIds.has(c.id),
    }));

    return { success: true, data: enriched };
  })

  // ─── Get Single Challenge Details ────────────────────────────────────────
  .get("/:id", async ({ user, params }) => {

    // Check event state
    const event = await getActiveEvent();
    if (event) {
      const state = getEventState(event);
      if (state === "pre-event") {
        throw new EventStateError("Challenges will be revealed when the event starts");
      }
    }

    const [challenge] = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        category: challenges.category,
        difficulty: challenges.difficulty,
        initialPoints: challenges.initialPoints,
        minPoints: challenges.minPoints,
        decay: challenges.decay,
        solveCount: challenges.solveCount,
        hints: challenges.hints,
        files: challenges.files,
        maxAttempts: challenges.maxAttempts,
        authorName: challenges.authorName,
      })
      .from(challenges)
      .where(and(eq(challenges.id, params.id), eq(challenges.isActive, true)));

    if (!challenge) {
      throw new NotFoundError("Challenge");
    }

    // Check if user has solved it
    const [userSolve] = await db
      .select({ id: solves.id })
      .from(solves)
      .where(and(eq(solves.userId, user.id), eq(solves.challengeId, params.id)));

    return {
      success: true,
      data: {
        ...challenge,
        currentPoints: getChallengePoints(challenge),
        solved: !!userSolve,
      },
    };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  });
