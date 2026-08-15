import { Elysia, t } from 'elysia';
import { ctfService } from '../services/ctf.service';
import { db } from '../db';
import { teams, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/login', async ({ body, request, set, cookie: { sessionToken } }) => {
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const res = await ctfService.login(body.teamName, body.leaderName, ipAddress, userAgent);
      
      sessionToken.set({
        value: res.sessionId,
        httpOnly: true,
        maxAge: 12 * 60 * 60, // 12h
        path: '/'
      });

      return { success: true, teamName: res.teamName };
    } catch (error: any) {
      set.status = 401;
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      teamName: t.String(),
      leaderName: t.String()
    })
  })
  .post('/logout', async ({ cookie: { sessionToken }, set }) => {
    if (sessionToken.value) {
      const team = await ctfService.validateSession(sessionToken.value);
      if (team) {
        await db.update(teams).set({ activeSessionId: null }).where(eq(teams.id, team.id));
        await db.delete(sessions).where(eq(sessions.id, sessionToken.value));
      }
      sessionToken.remove();
    }
    return { success: true };
  })
  .get('/me', async ({ cookie: { sessionToken }, set }) => {
    if (!sessionToken.value) {
      set.status = 401;
      return { success: false };
    }
    const team = await ctfService.validateSession(sessionToken.value);
    if (!team) {
      set.status = 401;
      return { success: false };
    }
    return { success: true, teamName: team.teamName };
  });
