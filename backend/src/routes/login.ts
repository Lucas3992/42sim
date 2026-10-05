import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { verifyPassword } from '../utils/password.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { isOnline } from '../utils/connectionRegistry.js';
import { setSessionCookie } from '../utils/session.js';

interface LoginBody {
	email: string;
    password: string;
}

export async function loginRoutes(app: FastifyInstance) {
  app.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
        hook: 'preHandler',
        keyGenerator: (req: any) => {
          const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
          return `${req.ip}:${email}`;
        },
      },
    },
  }, async (request, reply) => {
        const { email, password } = loginSchema.parse(request.body);
        const user = await prisma.user.findUnique({ where: {email: email}});
        
        if (!user) {
            reply.status(400).send({error: "Wrong login/password." });
            return;
        }

        if (!user.password_hash) {
            reply.status(400).send({error: "Did you try to login with 42 credentials?" });
            return ;
        }
        else {
            let hash: string = user.password_hash; 
            if ( await verifyPassword(password, hash) == false) {
                reply.status(400).send({error: "Wrong password." });
                return;
            }
        }

		if (isOnline(user.id)) {
			reply.status(409).send({ error: 'error.alreadyConnected' });
			return;
		}

		setSessionCookie(app, reply, user)
			.status(200)
			.send({ msg: "Login successfull." });
		})
};