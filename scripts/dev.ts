// Local development server with hot reload:  bun scripts/dev.ts  → http://localhost:5173
import { join } from 'node:path';
import index from '../index.html';

const pub = join(import.meta.dir, '..', 'public');
const server = Bun.serve({
  port: Number(process.env.PORT || 5173),
  development: true,
  routes: { '/': index },
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(join(pub, path.replace(/^\/+/, '')));
    if (path !== '/' && (await file.exists())) return new Response(file);
    return new Response('Not found', { status: 404 });
  },
});
console.log(`Dev server: ${server.url}`);
