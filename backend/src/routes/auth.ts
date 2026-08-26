  import type { FastifyInstance } from 'fastify';
  import { prisma } from '../prisma.js';
  import { verifyAuth } from '../utils/verifyAuth.js';

interface FtProfile {
  id: string;
  login: string;
  email: string;
  image?: { link?: string };
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/42/callback', async (request, reply) => {
    try {
      const { token } = await app.ftOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const meResponse = await fetch('https://api.intra.42.fr/v2/me', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (!meResponse.ok)
        return reply.status(502).send({ error: 'Failed to fetch 42 profile' });

      const me = await meResponse.json() as FtProfile;

      let user = await prisma.user.findUnique({ where: { ft_id: me.id } });

      if (!user) {
        const emailTaken = await prisma.user.findUnique({ where: { email: me.email } });

        if (emailTaken) {
          app.log.warn({ email: me.email }, '42 login blocked: email already used by another account');
          return reply.redirect('https://localhost:5173/nice-try');
        }

        const usernameTaken = await prisma.user.findUnique({ where: { username: me.login } });

        if (usernameTaken) {
          app.log.warn({ username: me.login }, '42 login blocked: username already taken');
          return reply.redirect('https://localhost:5173/login?error=username_taken');
        }

        user = await prisma.user.create({
          data: {
            email: me.email,
            username: me.login,
            ft_id: me.id,
            ft_login: me.login,
            avatar_url: me.image?.link ?? null,
            prefLang: 'EN',
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { ft_login: me.login },
        });
      }

      const jwtToken = app.jwt.sign(
        { userId: user.id, username: user.username },
        { expiresIn: '7d' }
      );

      reply
        .setCookie('token', jwtToken, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        })
        .redirect('https://localhost:5173/home');
    } catch (err) {
      app.log.error({ err }, 'OAuth42 callback failed');
      reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  app.get('/auth/me', { preHandler: verifyAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar_url: true,
        ft_login: true,
        prefLang: true,
      },
    });

    if (!user)
      return reply.status(404).send({ error: 'User not found' });

    return reply.send({ user });
  });

  app.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return reply.send({ ok: true });
  });
}