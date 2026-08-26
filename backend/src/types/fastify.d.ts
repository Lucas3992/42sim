import type { OAuth2Namespace } from '@fastify/oauth2';
import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    ftOAuth2: OAuth2Namespace;
  }
}