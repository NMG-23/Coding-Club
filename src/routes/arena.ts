/**
 * ARENA API ROUTES
 * 
 * FUTURE EXPANSION:
 * - Caching: The `/leaderboard` endpoint calculates scores on-the-fly. For 1,000+ teams, this will bottleneck. 
 *   You should introduce a Redis cache here that updates ONLY when a user submits a valid flag (cache invalidation).
 * - Rate Limiting: Add a rate-limiting plugin to `/submit` to prevent automated flag brute-forcing.
 */
import { Elysia, t } from 'elysia';
import { ctfService } from '../services/ctf.service';
import { db } from '../db';
import { challenges, solves, events } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { broadcast } from '../utils/broadcast';
import { createRateLimiter } from '../utils/rate-limit';

const submitRateLimiter = createRateLimiter({ max: 1, duration: 3000 });

export const arenaRoutes = new Elysia({ prefix: '/api/arena' })
  .get('/leaderboard', async ({ query }) => {
    let eventId = query.eventId ? parseInt(query.eventId as string) : null;
    if (eventId !== null && isNaN(eventId)) return { success: false, error: 'Invalid ID' };
    if (!eventId) {
      // Default to active event
      const activeEvent = await db.select().from(events).where(eq(events.isActive, true)).limit(1).get();
      if (!activeEvent) return { frozen: false, leaderboard: [] };
      eventId = activeEvent.id;
    }
    return await ctfService.getLeaderboard(eventId);
  })
  // Require session for authenticated arena routes
  .derive(async ({ cookie: { sessionToken }, set }) => {
    if (!sessionToken.value) {
      set.status = 401;
      throw new Error('Unauthorized');
    }
    const team = await ctfService.validateSession(sessionToken.value as string);
    if (!team) {
      set.status = 401;
      throw new Error('Invalid or expired session');
    }
    return { team };
  })
  .get('/challenges', async ({ team }) => {
    const allChalls = await db.select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      category: challenges.category,
      difficulty: challenges.difficulty,
      points: challenges.points,
      isActive: challenges.isActive
    }).from(challenges).where(and(eq(challenges.isActive, true), eq(challenges.eventId, team.eventId)));

    // Get team solves to mark challenges as solved
    const teamSolves = await db.select().from(solves).where(eq(solves.teamId, team.id));
    const solvedIds = new Set(teamSolves.map(s => s.challengeId));

    return allChalls.map(c => {
      return {
        ...c,
        solved: solvedIds.has(c.id)
      };
    });
  })
  .post('/submit', async ({ body, team, set }) => {
    try {
      const res = await ctfService.submitFlag(team.id, body.challengeId, body.flag);
      
      if (res.isCorrect) {
        if (res.firstBlood) {
          broadcast('challenge:first_blood', { challengeName: res.challengeName, teamName: team.teamName, eventId: res.eventId });
        }
        const lb = await ctfService.getLeaderboard(res.eventId);
        broadcast('leaderboard:update', lb);
      }
      
      return { success: true, isCorrect: res.isCorrect, firstBlood: res.firstBlood };
    } catch (e: any) {
      set.status = 400;
      return { success: false, error: e.message };
    }
  }, {
    beforeHandle: submitRateLimiter,
    body: t.Object({
      challengeId: t.Number(),
      flag: t.String({ maxLength: 500 })
    })
  });
