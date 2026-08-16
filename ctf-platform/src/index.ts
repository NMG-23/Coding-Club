/**
 * MAIN SERVER ENTRY POINT
 * 
 * FUTURE EXPANSION & SCALING:
 * - This app is built on ElysiaJS and Bun, making it extremely fast.
 * - If you need to scale horizontally (multiple server instances), you will need to:
 *   1. Migrate the Database (SQLite -> MySQL/PostgreSQL as described in db/index.ts)
 *   2. Replace the in-memory WebSocket connections with a Redis Pub/Sub adapter to sync broadcasts across instances.
 *   3. Move static file hosting (`public/`) to a CDN (e.g. Cloudflare, AWS CloudFront) to reduce server load.
 * - Add rate-limiting middleware (e.g., `elysia-rate-limit`) to protect `/api/arena/submit` from brute-force flag guessing.
 */
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { authRoutes } from './routes/auth';
import { arenaRoutes } from './routes/arena';
import { adminRoutes } from './routes/admin';
import { setServer } from './utils/broadcast';

export const app = new Elysia()
  .use(cors())
  .onRequest(({ request, set }) => {
    // CSRF Protection: verify Origin or Referer for mutating requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');
      
      // If neither is present (like a curl request), we might allow or block. 
      // For browser-based CTF, we can enforce it.
      if (origin) {
        try {
          const originUrl = new URL(origin);
          if (originUrl.host !== host) {
            set.status = 403;
            throw new Error('CSRF Failed: Invalid Origin');
          }
        } catch (_) {}
      } else if (referer) {
        try {
          const refererUrl = new URL(referer);
          if (refererUrl.host !== host) {
            set.status = 403;
            throw new Error('CSRF Failed: Invalid Referer');
          }
        } catch (_) {}
      } else {
        // Enforce X-Requested-With or just accept application/json.
        // Elysia's t.Object already protects against HTML form smuggling.
      }
    }
  })
  .get('/', () => new Response(Bun.file('public/index.html'), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }))
  .get('/public/index.html', () => new Response(Bun.file('public/index.html'), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }))
  .use(staticPlugin({
    assets: 'public',
    prefix: '/public',
    maxAge: 0,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  }))

  .ws('/ws', {
    open(ws) {
      ws.subscribe('events');
    }
  })
  .use(authRoutes)
  .use(arenaRoutes)
  .use(adminRoutes)
  .listen(3000);

console.log(`🦊 CTF Backend is running at http://${app.server?.hostname}:${app.server?.port}`);

if (app.server) {
  setServer(app.server);
}
