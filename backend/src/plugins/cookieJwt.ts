import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';


export default fp(async (fastify) => {

    await fastify.register(fastifyCookie);

    await fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET as string,
        cookie: {
            cookieName: 'token',
            signed: false,
        },
    });
}, { name: 'cookie-Jwt'})