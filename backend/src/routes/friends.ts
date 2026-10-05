import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../prisma.js'
import { friendRequestSchema, friendActionParamsSchema } from '../schemas/friends.schema.js'
import { verifyAuth } from '../utils/verifyAuth.js'
import { canonicalPair } from '../utils/ChatUtils.js'
import { isOnline as isUserOnline} from '../utils/connectionRegistry.js'
import { sendToUser } from '../utils/wsUtils.js'

// supprime la conversation privee (et ses messages, en cascade) entre deux users
// puis previent l'autre pour que son front se mette a jour
async function cutChat(actorId: number, otherId: number): Promise<void> {
  const [userAId, userBId] = canonicalPair(actorId, otherId);
  await prisma.conversation.deleteMany({
    where: { type: 'DIRECT', userAId, userBId },
  });
  sendToUser(otherId, { type: 'friendship_removed', userId: actorId });
}

type FriendUser = {
	id: number;
	username: string;
	displayName: string | null;
	avatar_url: string | null;
	lastSeenAt: Date | null;
};

type FriendshipRow = {
	userAId: number;
	userBId: number;
	userA: FriendUser;
	userB: FriendUser;
};

const friendsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/friends/request', { preHandler: verifyAuth }, async (req, reply) => {
    const { friendId } = friendRequestSchema.parse(req.body)
    const userId = req.user.userId

    if (friendId === userId)
      return reply.code(400).send({ error: "You can't befriend yourself." })

    const [userAId, userBId] = canonicalPair(userId, friendId);
    const requestedBy = userId;

    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } }
    });

    if (existing) {
      if (existing.status === 'PENDING' && existing.requestedBy !== userId) {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        })
        return reply.send(updated)
      }
      return reply.code(409).send({ error: 'friendship_already_exists', status: existing.status })
    }
    const friendship = await prisma.friendship.create({
      data: { userAId, userBId, requestedBy, status: 'PENDING' },
    })
    return reply.code(201).send(friendship)
  })

  fastify.post('/friends/:friendshipId/accept', { preHandler: verifyAuth }, async (req, reply) => {
    const { friendshipId } = friendActionParamsSchema.parse(req.params)
    const userId = req.user.userId

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })

    const isParticipant = friendship && (friendship.userAId === userId || friendship.userBId === userId)

    if (!friendship || !isParticipant || friendship.requestedBy === userId || friendship.status !== 'PENDING')
      return reply.code(404).send({ error: 'request not found' })

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
    return reply.send(updated)
  })

  fastify.post('/friends/:friendshipId/reject', { preHandler: verifyAuth }, async (req, reply) => {
    const { friendshipId } = friendActionParamsSchema.parse(req.params)
    const userId = req.user.userId

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })

    const isParticipant = friendship && (friendship.userAId === userId || friendship.userBId === userId)

    if (!friendship || !isParticipant || friendship.status !== 'PENDING' || friendship.requestedBy === userId)
      return reply.code(404).send({ error: 'request not found' })

    await prisma.friendship.delete({ where: { id: friendshipId } })
    return reply.code(204).send()
  })

  // friendId est l'id de l'UTILISATEUR a bloquer (pas l'id de la Friendship),
  // pour matcher ce que le frontend envoie (comme pour delete)
  // si la relation n'existe pas encore, on la cree directement avec le statut BLOCKED
  fastify.post('/friends/:friendId/block', { preHandler: verifyAuth }, async (req, reply) => {
    const friendId = Number((req.params as { friendId: string }).friendId)
    const userId = req.user.userId

    if (!Number.isInteger(friendId) || friendId === userId)
      return reply.code(400).send({ error: 'invalid_friend_id' })

    const [userAId, userBId] = canonicalPair(userId, friendId)

    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    })

    const friendship = existing
      ? await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'BLOCKED', respondedAt: new Date() },
        })
      : await prisma.friendship.create({
          data: { userAId, userBId, requestedBy: userId, status: 'BLOCKED', respondedAt: new Date() },
        })

    await cutChat(userId, friendId)
    return reply.send(friendship)
  })

  // NOTE: idem, :friendId est l'id de l'UTILISATEUR ami (pas l'id de la Friendship).
  fastify.delete('/friends/:friendId', { preHandler: verifyAuth }, async (req, reply) => {
    const friendId = Number((req.params as { friendId: string }).friendId)
    const userId = req.user.userId

    if (!Number.isInteger(friendId))
      return reply.code(400).send({ error: 'invalid_friend_id' })

    const [userAId, userBId] = canonicalPair(userId, friendId)

    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    })

    if (!friendship)
      return reply.code(404).send({ error: 'friendship_not_found' })

    await prisma.friendship.delete({ where: { id: friendship.id } })
    await cutChat(userId, friendId)
    return reply.code(204).send()
  })

  fastify.get('/friends', { preHandler: verifyAuth }, async (req, reply) => {
    const userId = req.user.userId
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatar_url: true, lastSeenAt: true } },
        userB: { select: { id: true, username: true, displayName: true, avatar_url: true, lastSeenAt: true } },
      },
    })

	const friends = friendships.map((f: FriendshipRow) => {
		const friend = f.userAId === userId ? f.userB : f.userA
		return { ...friend, isOnline: isUserOnline(friend.id) }
    })
    return reply.send(friends)
  })

  fastify.get('/friends/pending', { preHandler: verifyAuth }, async (req, reply) => {
    const userId = req.user.userId
    const pending = await prisma.friendship.findMany({
      where: {
        status: 'PENDING',
        requestedBy: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatar_url: true, isOnline: true, lastSeenAt: true } },
        userB: { select: { id: true, username: true, displayName: true, avatar_url: true, isOnline: true, lastSeenAt: true } },
      },
    })

    const pendingWithRequester = pending.map((f: typeof pending[number]) => ({
      ...f,
      requester: f.userAId === f.requestedBy ? f.userA : f.userB,
    }))
    return reply.send(pendingWithRequester)
  })
}

export default friendsRoutes