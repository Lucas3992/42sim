import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { hashPassword } from '../utils/password.js';
import { generateUsernameSuggestions } from '../utils/username.js';
import { registerSchema } from '../schemas/auth.schema.js';
import { setSessionCookie } from '../utils/session.js';


interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

function sanitizeLang(raw: unknown): 'EN' | 'FR' | 'NL' {
  if (raw === 'EN' || raw === 'FR' || raw === 'NL')
    return raw;
  return 'EN';
}

export async function registerRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {

        const { email, password, username, lang } = registerSchema.parse(request.body);
        const safeLang = sanitizeLang(lang);
        let user: string;

        if (!username) {
            let tmp: string[] = email.split("@");
            if (tmp[0])
                user = tmp[0];
            else {
                reply.status(400).send({error: "Not  a valid email" });
                return;
            }
        } 
        else 
            user = username;

        let ret = await prisma.user.findUnique({ where: { email: email } });

        if (ret){
            reply.status(409).send({ error: "Mail already used." });
            return;
        }

        let resultUser = await prisma.user.findUnique({ where: { username: user } });

        if (resultUser) {
            let array: string[] = await generateUsernameSuggestions(user);
            reply.status(409).send({ error: "Username already used.", suggestions: array });
            return;
        }
        
        const hashedPassword = await hashPassword(password);
        const userFinal = await prisma.user.create({
            data: {
                email: email,
                password_hash: hashedPassword,
                username: user,
                prefLang: safeLang,
            },
        });

        setSessionCookie(app, reply, userFinal)
			.status(201)
			.send({ msg: "User succesfully created." });
    });
}
