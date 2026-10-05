import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { verifyAuth } from '../utils/verifyAuth.js'

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(30),
})

function canonicalPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

const usersRoutes: FastifyPluginAsync = async (fastify) => {

	const languageBodySchema = z.object({
		lang: z.enum(['EN', 'FR', 'NL']),	
	})

	fastify.patch('/users/me/language', {
		preHandler: verifyAuth,
	}, async (req, reply) => {
		const parsed = languageBodySchema.safeParse(req.body)
		if (!parsed.success)
			return reply.status(400).send({ error: 'Invalid language' })
		const user = await prisma.user.update({
			where: { id: req.user.userId },
			data: { prefLang: parsed.data.lang },
			select: { prefLang: true },
		})
		return reply.send({ ok: true, prefLang: user.prefLang })
	})

  fastify.get('/users/search', {
    preHandler: verifyAuth,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req: any) => String(req.user?.userId ?? req.ip),
      },
    },
  }, async (req, reply) => {
    const parsed = searchQuerySchema.safeParse(req.query)

    if (!parsed.success)
      return reply.send([])

    const { q } = parsed.data
    const userId = req.user.userId

    const excludedRelations = await prisma.friendship.findMany({
      where: {
        status: { in: ['BLOCKED', 'ACCEPTED'] },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { userAId: true, userBId: true },
    })

    const blockedUserIds = excludedRelations .map((f: typeof excludedRelations[number]) =>
      f.userAId === userId ? f.userBId : f.userAId
    )

    const excludedIds = [userId, ...blockedUserIds]

    const users = await prisma.user.findMany({
      where: {
        username: { startsWith: q, mode: 'insensitive' },
        id: { notIn: excludedIds },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar_url: true,
      },
      orderBy: { username: 'asc' },
      take: 3,
    })

    if (users.length === 0)
      return reply.send([])

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: users.map((u: typeof users[number]) => {
          const [userAId, userBId] = canonicalPair(userId, u.id)
          return { userAId, userBId }
        }),
      },
    })

    const statusByUserId = new Map<number, string>()
    for (const f of friendships) {
      const otherId = f.userAId === userId ? f.userBId : f.userAId
      statusByUserId.set(otherId, f.status)
    }

    const result = users.map((u: typeof users[number]) => ({
      ...u,
      relationStatus: statusByUserId.get(u.id) ?? null,
    }))

    return reply.send(result)
  })
}

export default usersRoutes