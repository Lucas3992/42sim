import type { FastifyInstance, FastifyReply } from 'fastify';

const SESSION_MAX_AGE = 60 * 60 * 24;

export function setSessionCookie(
    app: FastifyInstance,
    reply: FastifyReply,
    user: { id: number; username: string },
): FastifyReply {
    const jwtToken = app.jwt.sign(
        { userId: user.id, username: user.username },
        { expiresIn: '1d' },
    );
    return reply.setCookie('token', jwtToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
    });
}