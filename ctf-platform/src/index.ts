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
