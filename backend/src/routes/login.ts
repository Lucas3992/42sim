// backend/src/routes/login.ts

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { verifyPassword } from '../utils/password.js';
import { loginSchema } from '../schemas/auth.schema.js';

interface LoginBody {
  email: string;
  password: string;
}

export async function loginRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    try {
        const result = loginSchema.safeParse(request.body);

        if (!result.success)
            return reply.status(400).send({error: result.error.issues[0]?.message });

        const {email, password} = result.data;

        const user = await prisma.user.findUnique({ where: {email: email}});
        
        if (!user)
        {
            reply.status(400).send({error: "Wrong login/password." });
            return;
        }

        if (!user.password_hash) {
            reply.status(400).send({error: "Did you try to login with 42 credentials?" });
            return ;
        }
        else {
            let hash: string = user.password_hash; 
            if ( await verifyPassword(password, hash) == false)
            {
                reply.status(400).send({error: "Wrong password." });
                return;
            }
        }

        const jwtToken = app.jwt.sign(
            { userId: user.id , username: user.username},
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
            .status(200).send({msg: "Login successfull."});
        }
        catch (err) {
            app.log.error(err);
            reply.status(500).send({ error: 'Login failed' });
    }
  })
};
