import { Elysia, t } from 'elysia';
import { ctfService } from '../services/ctf.service';
import { db } from '../db';
import { challenges, solves } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { broadcast } from '../utils/broadcast';

export const arenaRoutes = new Elysia({ prefix: '/api/arena' })
  // Require session for arena routes
  .derive(async ({ cookie: { sessionToken }, set }) => {
    if (!sessionToken.value) {
      set.status = 401;
      throw new Error('Unauthorized');
    }
    const team = await ctfService.validateSession(sessionToken.value);
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
    }).from(challenges).where(eq(challenges.isActive, true));

    // Get team solves to mark challenges as solved
    const teamSolves = await db.select().from(solves).where(eq(solves.teamId, team.id));
    const solvedIds = new Set(teamSolves.map(s => s.challengeId));

    return allChalls.map(c => ({ ...c, solved: solvedIds.has(c.id) }));
  })
  .post('/submit', async ({ body, team, set }) => {
    try {
      const res = await ctfService.submitFlag(team.id, body.challengeId, body.flag);
      
      if (res.isCorrect) {
        // Trigger broadcasts
        if (res.firstBlood) {
          broadcast('challenge:first_blood', { challengeName: res.challengeName, teamName: team.teamName });
        }
        // Always trigger leaderboard update when score changes
        const lb = await ctfService.getLeaderboard();
        broadcast('leaderboard:update', lb);
      }
      
      return { success: true, isCorrect: res.isCorrect, firstBlood: res.firstBlood };
    } catch (e: any) {
      set.status = 400;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      challengeId: t.Number(),
      flag: t.String()
    })
  })
  .get('/leaderboard', async () => {
    return await ctfService.getLeaderboard();
  });
