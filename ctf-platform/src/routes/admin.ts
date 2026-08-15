import { Elysia, t } from 'elysia';
import { db } from '../db';
import { teams, eventConfig, sessions, submissions, challenges, events } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { broadcast } from '../utils/broadcast';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key';

async function getAdminEventId(queryEventId?: string) {
  if (queryEventId) return parseInt(queryEventId);
  const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
  return activeEvent?.id;
}

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .derive(({ headers, set }) => {
    const authHeader = headers['authorization'];
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      set.status = 401;
      throw new Error('Unauthorized Admin Access');
    }
  })
  .post('/events', async ({ body }) => {
    const now = new Date();
    const [newEvent] = await db.insert(events).values({
      name: body.name,
      description: body.description,
      isActive: body.isActive,
      createdAt: now
    }).returning();

    await db.insert(eventConfig).values({
      eventId: newEvent.id,
      isPaused: true,
      scoreboardFrozen: false
    });

    const dir = path.join(process.cwd(), 'uploads', 'events', newEvent.id.toString());
    fs.mkdirSync(dir, { recursive: true });

    return { success: true, event: newEvent };
  }, {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      isActive: t.Boolean()
    })
  })
  .delete('/events/:eventId', async ({ params: { eventId } }) => {
    const id = parseInt(eventId);
    await db.delete(events).where(eq(events.id, id));

    const dir = path.join(process.cwd(), 'uploads', 'events', id.toString());
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return { success: true };
  })
  .get('/stats', async ({ query }) => {
    const eventId = await getAdminEventId(query.eventId as string);
    if (!eventId) return { teams: 0, activeSessions: 0, submissions: 0, challenges: 0 };

    const totalTeams = await db.select({ count: sql<number>`count(*)` }).from(teams).where(eq(teams.eventId, eventId)).get();
    
    // active sessions for this event
    const activeSessions = await db.select({ count: sql<number>`count(*)` })
      .from(sessions)
      .innerJoin(teams, eq(sessions.teamId, teams.id))
      .where(eq(teams.eventId, eventId))
      .get();
      
    const totalSubmissions = await db.select({ count: sql<number>`count(*)` })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(eq(teams.eventId, eventId))
      .get();
      
    const totalChallenges = await db.select({ count: sql<number>`count(*)` }).from(challenges).where(eq(challenges.eventId, eventId)).get();

    return {
      teams: totalTeams?.count || 0,
      activeSessions: activeSessions?.count || 0,
      submissions: totalSubmissions?.count || 0,
      challenges: totalChallenges?.count || 0
    };
  })
  .get('/teams', async ({ query }) => {
    const eventId = await getAdminEventId(query.eventId as string);
    if (!eventId) return [];
    return await db.select({ id: teams.id, teamName: teams.teamName, activeSessionId: teams.activeSessionId }).from(teams).where(eq(teams.eventId, eventId));
  })
  .post('/reset-session', async ({ body }) => {
    await db.update(teams).set({ activeSessionId: null }).where(eq(teams.id, body.teamId));
    await db.delete(sessions).where(eq(sessions.teamId, body.teamId));
    return { success: true };
  }, {
    body: t.Object({ teamId: t.Number() })
  })
  .post('/event-control', async ({ body }) => {
    const eventId = await getAdminEventId(body.eventId?.toString());
    if (!eventId) return { success: false, error: 'No active event found' };

    const config = await db.select().from(eventConfig).where(eq(eventConfig.eventId, eventId)).limit(1).get();
    const updateData: any = {};
    const eventUpdateData: any = {};
    const now = new Date();

    if (body.action === 'start') {
      updateData.isPaused = false;
      eventUpdateData.startTime = now;
    } else if (body.action === 'pause') {
      updateData.isPaused = true;
    } else if (body.action === 'resume') {
      updateData.isPaused = false;
    } else if (body.action === 'stop') {
      updateData.isPaused = true;
      eventUpdateData.endTime = now;
    } else if (body.action === 'freeze') {
      updateData.scoreboardFrozen = true;
    } else if (body.action === 'unfreeze') {
      updateData.scoreboardFrozen = false;
    }

    if (config) {
      await db.update(eventConfig).set(updateData).where(eq(eventConfig.id, config.id));
    } else {
      await db.insert(eventConfig).values({ ...updateData, eventId, isPaused: false, scoreboardFrozen: false });
    }
    
    if (Object.keys(eventUpdateData).length > 0) {
      await db.update(events).set(eventUpdateData).where(eq(events.id, eventId));
    }

    broadcast('event:state_change', { action: body.action, timestamp: now.getTime(), eventId });
    return { success: true };
  }, {
    body: t.Object({
      eventId: t.Optional(t.Number()),
      action: t.Union([
        t.Literal('start'), t.Literal('pause'), t.Literal('resume'), t.Literal('stop'), t.Literal('freeze'), t.Literal('unfreeze')
      ])
    })
  })
  .post('/verify-teams/:eventId', async ({ params: { eventId }, body }) => {
    let eId = parseInt(eventId);
    if (isNaN(eId) || eventId === 'active') {
       const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
       if (!activeEvent) return { success: false, error: 'No active event found' };
       eId = activeEvent.id;
    }
    
    const file = body.sheet;
    const text = await file.text();
    
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (parsed.errors.length > 0) {
      return { success: false, errors: parsed.errors };
    }

    const rows = parsed.data as Record<string, string>[];
    
    let verifiedCount = 0;
    const notFound: any[] = [];
    
    for (const row of rows) {
      const tName = (row.team_name || row.teamname || row.team)?.trim();
      const lName = (row.leader_name || row.leadername || row.leader)?.trim();
      
      if (!tName || !lName) continue;
      
      const teamInDb = await db.select().from(teams).where(
        and(
          sql`lower(${teams.teamName}) = ${tName.toLowerCase()}`,
          sql`lower(${teams.leaderName}) = ${lName.toLowerCase()}`,
          eq(teams.eventId, eId)
        )
      ).get();
      
      if (teamInDb) {
        await db.update(teams).set({ isVerified: true }).where(eq(teams.id, teamInDb.id));
        verifiedCount++;
      } else {
        notFound.push({ teamName: tName, leaderName: lName });
      }
    }
    
    return {
      success: true,
      verifiedCount,
      notFoundCount: notFound.length,
      notFound
    };
  }, {
    body: t.Object({
      sheet: t.File()
    })
  });
