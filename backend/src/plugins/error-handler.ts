import type { FastifyInstance, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'validation_error',
        details: error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025')
        return reply.code(404).send({ error: 'not_found' })
      if (error.code === 'P2002') 
        return reply.code(409).send({ error: 'already_exists' })
    }

    if (error.validation) {
      return reply.code(400).send({ error: 'bad_request', details: error.validation })
    }

    // erreurs deja typees par un plugin Fastify (ex: @fastify/rate-limit -> 429,
    // @fastify/multipart -> 413, etc.): on respecte leur statusCode et leur
    // payload au lieu de les ecraser en 500
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name ?? 'error',
        message: error.message,
      })
    }

    req.log.error(error)
    return reply.code(500).send({ error: 'internal_server_error' })
  })
}