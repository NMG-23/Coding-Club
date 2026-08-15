import { Elysia, t } from 'elysia';
import { db } from '../db';
import { teams, eventConfig, sessions, submissions, challenges } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { broadcast } from '../utils/broadcast';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key';

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .derive(({ headers, set }) => {
    const authHeader = headers['authorization'];
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      set.status = 401;
      throw new Error('Unauthorized Admin Access');
    }
  })
  .get('/stats', async () => {
    const totalTeams = await db.select({ count: sql<number>`count(*)` }).from(teams).get();
    const activeSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions).get();
    const totalSubmissions = await db.select({ count: sql<number>`count(*)` }).from(submissions).get();
    const totalChallenges = await db.select({ count: sql<number>`count(*)` }).from(challenges).get();

    return {
      teams: totalTeams?.count || 0,
      activeSessions: activeSessions?.count || 0,
      submissions: totalSubmissions?.count || 0,
      challenges: totalChallenges?.count || 0
    };
  })
  .get('/teams', async () => {
    return await db.select({ id: teams.id, teamName: teams.teamName, activeSessionId: teams.activeSessionId }).from(teams);
  })
  .post('/reset-session', async ({ body }) => {
    await db.update(teams).set({ activeSessionId: null }).where(eq(teams.id, body.teamId));
    await db.delete(sessions).where(eq(sessions.teamId, body.teamId));
    return { success: true };
  }, {
    body: t.Object({ teamId: t.Number() })
  })
  .post('/event-control', async ({ body }) => {
    const config = await db.select().from(eventConfig).limit(1).get();
    const updateData: any = {};
    const now = new Date();

    if (body.action === 'start') {
      updateData.isPaused = false;
      updateData.startTime = now;
    } else if (body.action === 'pause') {
      updateData.isPaused = true;
    } else if (body.action === 'resume') {
      updateData.isPaused = false;
    } else if (body.action === 'stop') {
      updateData.isPaused = true;
      updateData.endTime = now;
    } else if (body.action === 'freeze') {
      updateData.scoreboardFrozen = true;
    } else if (body.action === 'unfreeze') {
      updateData.scoreboardFrozen = false;
    }

    if (config) {
      await db.update(eventConfig).set(updateData).where(eq(eventConfig.id, config.id));
    } else {
      await db.insert(eventConfig).values({ ...updateData, isPaused: false, scoreboardFrozen: false });
    }

    broadcast('event:state_change', { action: body.action, timestamp: now.getTime() });
    return { success: true };
  }, {
    body: t.Object({
      action: t.Union([
        t.Literal('start'), t.Literal('pause'), t.Literal('resume'), t.Literal('stop'), t.Literal('freeze'), t.Literal('unfreeze')
      ])
    })
  });
