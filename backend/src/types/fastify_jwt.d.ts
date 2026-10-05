import '@fastify/jwt'

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload : {userId: number ; username: string };
        user: { userId: number; username: string };
    }
}