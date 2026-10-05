import Fastify from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { authRoutes } from './routes/auth.js';
import { registerRoutes } from './routes/register.js';
import { loginRoutes } from './routes/login.js';
import { avatarRoutes } from './routes/avatar.js';
import cookieJwtPlugin from './plugins/cookieJwt.js';
import friendsRoutes from './routes/friends.js';
import usersRoutes from './routes/users.routes.js'
import { registerErrorHandler } from './plugins/error-handler.js';
import websocketPlugin from './plugins/websocket.js';
import chatRoutes from './routes/chat.js';
import conversationRoutes from './routes/conversations.js';
import { prisma } from './prisma.js';

const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = Fastify({
  logger: true,
  https: {
    key: fs.readFileSync('/app/certs/localhost-key.pem'),
    cert: fs.readFileSync('/app/certs/localhost.pem'),
  },
});


app.register(fastifyCors, {
  origin: 'https://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

});
// protection contre spam  GET /users/search?**lettre**=...
// global: false => aucune route est limitee par défaut
// on active la limite explicitement route par route avec config.rateLimit
// pour pas casser les routes existantes (login, /friends, etc) qui en ont pas besoin
app.register(fastifyRateLimit, {
  global: false,
  errorResponseBuilder: (_req, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Retry in ${context.after}.`,
  }),
});

app.register(cookieJwtPlugin);
app.register(websocketPlugin)

app.register(fastifyOauth2, {
  name: 'ftOAuth2',
  scope: ['public'],
  credentials: {
    client: {
      id: process.env.FT_CLIENT_ID as string,
      secret: process.env.FT_CLIENT_SECRET as string,
    },
    auth: {
      authorizeHost: 'https://api.intra.42.fr',
      authorizePath: '/oauth/authorize',
      tokenHost: 'https://api.intra.42.fr',
      tokenPath: '/oauth/token',
    },
  },
  startRedirectPath: '/auth/42',
  callbackUri: process.env.FT_REDIRECT_URI as string,
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/avatars/',
});

registerErrorHandler(app);
app.register(registerRoutes);
app.register(avatarRoutes);
app.register(loginRoutes);
app.register(authRoutes);
app.register(friendsRoutes);
app.register(usersRoutes);
app.register(chatRoutes);
app.register(conversationRoutes);

app.get('/', async () => {
  return { status: 'ok' };
});

await prisma.user.updateMany({ where: { isOnline: true }, data: { isOnline: false } })

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});