import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { authRoutes } from './routes/auth';
import { arenaRoutes } from './routes/arena';
import { adminRoutes } from './routes/admin';

export const app = new Elysia()
  .use(cors())
  .get('/', ({ set }) => {
    set.redirect = '/public/index.html';
  })
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

// Utility to broadcast events
export const broadcast = (type: string, payload: any) => {
  if (app.server) {
    app.server.publish('events', JSON.stringify({ type, payload }));
  }
};
