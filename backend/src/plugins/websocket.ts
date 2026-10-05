import fastifyWebsocket from '@fastify/websocket'
import fp from 'fastify-plugin';

export default fp(async (app) => {
      await app.register(fastifyWebsocket, { options: { maxPayload: 64 * 1024 } })
})
