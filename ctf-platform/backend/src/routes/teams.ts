import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import {
  createTeam,
  joinTeam,
  leaveTeam,
  getTeamWithMembers,
} from "../services/team.service";
import type { AuthContext } from "../utils/types";

export const teamRoutes = new Elysia({ prefix: "/teams" })
  .use(rateLimiter())

  // ─── Create a Team ───────────────────────────────────────────────────────
  .use(authMiddleware)
  .post(
    "/",
    async (ctx: any) => {
      const { user } = ctx as unknown as AuthContext;
      const body = (ctx as any).body as { name: string };
      const team = await createTeam(user.id, body.name);
      return { success: true, data: team };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 64 }),
      }),
    }
  )

  // ─── Join Team via Invite Code ───────────────────────────────────────────
  .post(
    "/join",
    async (ctx: any) => {
      const { user } = ctx as unknown as AuthContext;
      const body = (ctx as any).body as { inviteCode: string };
      const team = await joinTeam(user.id, body.inviteCode);
      return { success: true, data: team };
    },
    {
      body: t.Object({
        inviteCode: t.String({ minLength: 8, maxLength: 8 }),
      }),
    }
  )

  // ─── Leave Team ──────────────────────────────────────────────────────────
  .post("/leave", async (ctx: any) => {
    const { user } = ctx as unknown as AuthContext;
    const result = await leaveTeam(user.id);
    return { success: true, ...result };
  })

  // ─── Get My Team ─────────────────────────────────────────────────────────
  .get("/:id/solves", async (ctx: any) => {
    const { user } = ctx as unknown as AuthContext;
    if (!user.teamId) {
      return { success: true, data: null };
    }
    const team = await getTeamWithMembers(user.teamId);
    return { success: true, data: team };
  })

  // ─── Get Team by ID ──────────────────────────────────────────────────────
  .get("/:id", async (ctx: any) => {
    const params = (ctx as any).params as { id: string };
    const team = await getTeamWithMembers(params.id);
    return { success: true, data: team };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  });
