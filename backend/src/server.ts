import Fastify from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { authRoutes } from './routes/auth.js';
import { registerRoutes } from './routes/register.js';
import { loginRoutes } from './routes/login.js';
import { avatarRoutes } from './routes/avatar.js';
import cookieJwtPlugin from './plugins/cookieJwt.js';

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
});

app.register(cookieJwtPlugin);

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

app.register(registerRoutes);
app.register(avatarRoutes);
app.register(loginRoutes);
app.register(authRoutes);

app.get('/', async () => {
  return { status: 'ok' };
});

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});