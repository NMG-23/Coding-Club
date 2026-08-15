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
  .get('/', ({ redirect }) => redirect('/public/index.html'))
  .use(staticPlugin({
    assets: 'public',
    prefix: '/public'
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
