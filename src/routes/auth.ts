/**
 * AUTHENTICATION ROUTES
 * 
 * FUTURE EXPANSION:
 * - Current authentication is session-based and stores session IDs in the database.
 * - For a larger scale CTF (e.g., across multiple subdomains), consider migrating to stateless JWTs (JSON Web Tokens).
 *   This avoids hitting the database for every single authenticated request, significantly improving throughput.
 *   ElysiaJS has a built-in JWT plugin (`@elysiajs/jwt`) that you can easily drop in here.
 */
import { Elysia, t } from 'elysia';
import { ctfService } from '../services/ctf.service';
import { db } from '../db';
import { teams, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createRateLimiter } from '../utils/rate-limit';

const loginRateLimiter = createRateLimiter({ max: 5, duration: 60000 });

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/login', async ({ body, request, set, cookie: { sessionToken } }) => {
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const res = await ctfService.login(body.teamName, body.leaderName, ipAddress, userAgent);
      
      sessionToken.set({
        value: res.sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 12 * 60 * 60, // 12h
        path: '/'
      });

      return { success: true, teamName: res.teamName };
    } catch (error: any) {
      set.status = 401;
      return { success: false, error: error.message };
    }
  }, {
    beforeHandle: loginRateLimiter,
    body: t.Object({
      teamName: t.String({ minLength: 1, maxLength: 100 }),
      leaderName: t.String({ minLength: 1, maxLength: 100 })
    })
  })
  .post('/logout', async ({ cookie: { sessionToken }, set }) => {
    if (sessionToken.value) {
      const team = await ctfService.validateSession(sessionToken.value as string);
      if (team) {
        await db.update(teams).set({ activeSessionId: null }).where(eq(teams.id, team.id));
        await db.delete(sessions).where(eq(sessions.id, sessionToken.value as string));
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
    const team = await ctfService.validateSession(sessionToken.value as string);
    if (!team) {
      set.status = 401;
      return { success: false };
    }
    return { success: true, teamName: team.teamName };
  });
