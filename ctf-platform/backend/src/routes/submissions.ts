import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import { submitFlag } from "../services/submission.service";
import { db } from "../db";
import { submissions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import type { AuthContext } from "../utils/types";

export const submissionRoutes = new Elysia({ prefix: "/submissions" })
  .use(authMiddleware)
  .use(rateLimiter())

  // ─── Submit Flag ─────────────────────────────────────────────────────────
  .post(
    "/",
    async (ctx: any) => {
      const { user } = ctx as unknown as AuthContext;
      const body = (ctx as any).body as { challengeId: string; flag: string };

      const result = await submitFlag(
        user.id,
        user.teamId,
        body.challengeId,
        body.flag
      );

      return {
        success: true,
        data: result,
      };
    },
    {
      body: t.Object({
        challengeId: t.String(),
        flag: t.String({ minLength: 1, maxLength: 500 }),
      }),
    }
  )

  // ─── Get User's Submission History ───────────────────────────────────────
  .get("/me", async (ctx: any) => {
    const { user } = ctx as unknown as AuthContext;
    const query = (ctx as any).query as { limit?: string; offset?: string };
    const limit = parseInt(query.limit || "50");
    const offset = parseInt(query.offset || "0");

    const userSubmissions = await db
      .select({
        id: submissions.id,
        challengeId: submissions.challengeId,
        isCorrect: submissions.isCorrect,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(eq(submissions.userId, user.id))
      .orderBy(desc(submissions.submittedAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: userSubmissions };
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  });
