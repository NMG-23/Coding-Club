/**
 * ADMIN API ROUTES
 * 
 * FUTURE EXPANSION:
 * - The admin routes are currently protected by a static Bearer token (`ADMIN_SECRET`).
 * - For a more secure, multi-admin setup, consider integrating a proper Role-Based Access Control (RBAC) system.
 *   You can add an `isAdmin` boolean to the `teams` table or create a separate `users` table for administrators,
 *   and use session/JWT validation here instead of a hardcoded token.
 * - This file contains the logic for parsing Excel uploads. For massive Excel files (e.g. 100,000+ rows),
 *   you should move the parsing logic to a background worker (e.g. BullMQ) to avoid blocking the main event loop.
 */
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { teams, eventConfig, sessions, submissions, challenges, events } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { broadcast } from '../utils/broadcast';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error('CRITICAL ERROR: ADMIN_SECRET environment variable is not set.');
  process.exit(1);
}

if (ADMIN_SECRET.length < 16) {
  console.error('CRITICAL ERROR: ADMIN_SECRET must be at least 16 characters long for security reasons.');
  process.exit(1);
}

import * as crypto from 'crypto';

const activeAdminSessions = new Set<string>();

/**
 * Generate a random admin session token.
 * This is used as the cookie value so the actual secret is never stored client-side.
 */
export function generateAdminSession(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify that a cookie value is a currently active admin session.
 */
export function verifyAdminToken(token: string): boolean {
  return activeAdminSessions.has(token);
}

async function getAdminEventId(queryEventId?: string) {
  if (queryEventId) return parseInt(queryEventId);
  const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
  return activeEvent?.id;
}

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  // Login/logout endpoints are placed BEFORE the .derive() guard so they are not protected
  .post('/login', ({ body, cookie: { adminSession }, set }) => {
    if (!body.secret || body.secret.length !== ADMIN_SECRET.length || !crypto.timingSafeEqual(Buffer.from(body.secret), Buffer.from(ADMIN_SECRET))) {
      set.status = 401;
      return { success: false, error: 'Invalid admin secret' };
    }
    const sessionId = generateAdminSession();
    activeAdminSessions.add(sessionId);
    adminSession.set({
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours
      path: '/'
    });
    return { success: true };
  }, {
    body: t.Object({ secret: t.String() })
  })
  .post('/logout', ({ cookie: { adminSession } }) => {
    if (adminSession.value) {
      activeAdminSessions.delete(adminSession.value as string);
    }
    adminSession.remove();
    return { success: true };
  })
  .derive(({ headers, set, cookie: { adminSession } }) => {
    // Check httpOnly cookie first (browser sessions)
    if (adminSession.value && verifyAdminToken(adminSession.value as string)) {
      return; // authenticated via cookie
    }
    // Fall back to Authorization header (curl / API usage)
    const authHeader = headers['authorization'];
    if (authHeader) {
      const expectedHeader = `Bearer ${ADMIN_SECRET}`;
      if (
        authHeader.length === expectedHeader.length &&
        crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedHeader))
      ) {
        return; // authenticated via header
      }
    }
    set.status = 401;
    throw new Error('Unauthorized Admin Access');
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
    // If the frontend passed 'active' instead of an ID, we resolve the ID of the currently active event
    let eId = parseInt(eventId);
    if (isNaN(eId) || eventId === 'active') {
      const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
      if (!activeEvent) return { success: false, error: 'No active event found' };
      eId = activeEvent.id;
    }

    const file = body.sheet;
    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    let verifiedCount = 0;
    const notFound: any[] = [];

    for (const row of rows) {
      // Normalize column headers to lowercase and snake_case so it handles "Team Name", "teamName", etc.
      const normalizedRow: Record<string, string> = {};
      for (const key in row) {
        normalizedRow[key.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[key]);
      }

      // Look for any standard variation of "Teams" and "Leaders"
      const tName = (normalizedRow.teams || normalizedRow.team_name || normalizedRow.teamname || normalizedRow.team)?.trim();
      const lName = (normalizedRow.leaders || normalizedRow.leader_name || normalizedRow.leadername || normalizedRow.leader)?.trim();

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
        try {
          await db.insert(teams).values({
            eventId: eId,
            teamName: tName,
            leaderName: lName,
            members: normalizedRow.members || 'Imported via Admin',
            isVerified: true
          });
          verifiedCount++;
        } catch (err) {
          notFound.push({ teamName: tName, leaderName: lName });
        }
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
  })
  .post('/import-challenges/:eventId', async ({ params: { eventId }, body }) => {
    // If the frontend passed 'active' instead of an ID, we resolve the ID of the currently active event
    let eId = parseInt(eventId);
    if (isNaN(eId) || eventId === 'active') {
      const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
      if (!activeEvent) return { success: false, error: 'No active event found' };
      eId = activeEvent.id;
    }

    const file = body.sheet;
    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    let importedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Strip spaces from headers for easier matching (e.g. "Problem Statement" -> "problemstatement")
      const normalizedRow: Record<string, string> = {};
      for (const key in row) {
        normalizedRow[key.trim().toLowerCase().replace(/\s+/g, '')] = String(row[key]);
      }

      // Read columns with sensible fallbacks
      let description = normalizedRow['problemstatements'] || normalizedRow['problemstatement'] || normalizedRow['description'] || normalizedRow['question'] || normalizedRow['questions'] || normalizedRow['statement'] || normalizedRow['challenge'] || normalizedRow['text'] || '';
      const hint = normalizedRow['hint'] || '';

      let rawFlag = (normalizedRow['flag'] || normalizedRow['answer'] || normalizedRow['answers'] || normalizedRow['capture'] || '').trim().toLowerCase();

      // Ensure all answers are formatted precisely as cc{lowercase}
      if (rawFlag && !rawFlag.startsWith('cc{')) {
        rawFlag = `cc{${rawFlag}}`;
      }

      // Skip empty rows
      if (!description && !rawFlag) continue;

      // Append hints to the end of the description instead of using a separate database column
      if (hint) {
        description += `\n\n**Hint:** ${hint}`;
      }

      // Default metadata if not provided in the Excel sheet
      const title = normalizedRow['title'] || `Challenge ${i + 1}`;
      const category = normalizedRow['category'] || 'Misc';
      const difficulty = normalizedRow['difficulty'] || 'Medium';
      const points = parseInt(normalizedRow['points']) || 100;

      await db.insert(challenges).values({
        eventId: eId,
        title,
        description,
        category,
        difficulty,
        points,
        serverSideFlag: rawFlag
      });
      importedCount++;
    }

    return { success: true, importedCount };
  }, {
    body: t.Object({
      sheet: t.File()
    })
  })
  .delete('/teams/:eventId', async ({ params: { eventId } }) => {
    // If the frontend passed 'active' instead of an ID, we resolve the ID of the currently active event
    let eId = parseInt(eventId);
    if (isNaN(eId) || eventId === 'active') {
      const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
      if (!activeEvent) return { success: false, error: 'No active event found' };
      eId = activeEvent.id;
    }
    await db.delete(teams).where(eq(teams.eventId, eId));
    return { success: true };
  })
  .delete('/challenges/:eventId', async ({ params: { eventId } }) => {
    // If the frontend passed 'active' instead of an ID, we resolve the ID of the currently active event
    let eId = parseInt(eventId);
    if (isNaN(eId) || eventId === 'active') {
      const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
      if (!activeEvent) return { success: false, error: 'No active event found' };
      eId = activeEvent.id;
    }
    await db.delete(challenges).where(eq(challenges.eventId, eId));
    return { success: true };
  });
