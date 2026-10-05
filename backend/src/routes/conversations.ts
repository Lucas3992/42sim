import z from "zod"
import { verifyAuth } from "../utils/verifyAuth.js"
import { prisma } from "../prisma.js"
import type { FastifyInstance } from "fastify"
import { isOnline as isUserOnline } from "../utils/connectionRegistry.js"
import { canonicalPair, canSendTo, LOBBY_SLUG } from "../utils/ChatUtils.js"

const createConversationSchema = z.object({
  targetUserId: z.number().int().positive(),
})

const messagesParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const messagesQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

const userParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

type UserLite = { id: number; username: string; avatar_url: string | null };

type MessageRow = {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    deletedAt: Date | null;
};

type ConversationRow = {
    id: number;
    userAId: number | null;
    userBId: number | null;
    userA: UserLite | null;
    userB: UserLite | null;
    messages: MessageRow[];
};

type UnreadConversationRow = {
	id: number;
	userAId: number | null;
	userBId: number | null;
	members: { lastReadAt: Date | null }[];
};

export default async function conversationRoutes(app: FastifyInstance) {
  app.post('/conversations', { preHandler: [verifyAuth] }, async (request, reply) => {

    const body = createConversationSchema.parse(request.body);
    const userId = request.user.userId;

    if (body.targetUserId === request.user.userId)
      return reply.code(400).send({ error: 'cannot_dm_self' });

    const [userAId, userBId] = canonicalPair(userId, body.targetUserId);

    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: userAId, userBId: userBId } }
    });

    if (!friendship || friendship.status !== 'ACCEPTED')
      return reply.code(403).send({ error: 'friendship_not_found' })

    const convo = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId: userAId, userBId: userBId } },
      update: {},
      create: { type: 'DIRECT', userAId: userAId, userBId: userBId },
    })

    return reply.code(200).send(convo);
  })

  app.get('/conversations', { preHandler: [verifyAuth] }, async (request, reply) => {

    const userId = request.user.userId;

    const conversations = await prisma.conversation.findMany({
      where: { OR: [ { userAId: userId }, { userBId: userId } ]},
      include: {
        userA: { select: { id: true, username: true, avatar_url: true } },
        userB: { select: { id: true, username: true, avatar_url: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

	const result = conversations.map((c: ConversationRow) => {
		const other = c.userAId === userId ? c.userB : c.userA
		return {
			id: c.id,
			otherUser: other ? { ...other, isOnline: isUserOnline(other.id) } : null,
			lastMessage: c.messages[0] ?? null,
		}
	})
    return reply.code(200).send(result);
  })

  app.get('/conversations/lobby', { preHandler: [verifyAuth] }, async (request, reply) => {
    const lobby = await prisma.conversation.findUnique({
      where: { slug: LOBBY_SLUG }
    })
    if (!lobby)
      return reply.code(404).send({ error: "lobby_not_seeded" })
    return reply.code(200).send(lobby)
  })

  app.get('/conversations/:id/messages', { preHandler: [verifyAuth] }, async (request, reply) => {

    const userId = request.user.userId;

    const { id } = messagesParamsSchema.parse(request.params);
    const { cursor, limit } = messagesQuerySchema.parse(request.query);

    const result = await canSendTo(userId, id);
    if (!result)
      return reply.code(403).send({ error: "forbidden action." })

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    let peerLastReadAt: Date | null = null;

    if (conversation?.type === 'DIRECT') {
      const peerId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
      if (peerId) {
        const peerMember = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId: id, userId: peerId } },
        });
        peerLastReadAt = peerMember?.lastReadAt ?? null;
      }
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const nextCursor = messages.length < limit ? null : messages[messages.length - 1].id

    return reply.code(200).send({ messages, nextCursor, peerLastReadAt });
  })

  app.get('/users/:id', { preHandler: [verifyAuth] }, async (request, reply) => {

    const { id } = userParamsSchema.parse(request.params);

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true, username: true, displayName: true, avatar_url: true, lastSeenAt: true },
    })

    if (!user)
      return reply.code(404).send({ error: "user not found." });

    return reply.code(200).send({ ...user, isOnline: isUserOnline(user.id) })
  })

  app.get('/conversations/unread', { preHandler: [verifyAuth] }, async (request, reply) => {
		const userId = request.user.userId;

		const conversations = await prisma.conversation.findMany({
			where: { type: 'DIRECT', OR: [{ userAId: userId }, { userBId: userId }] },
				select: {
					id: true,
					userAId: true,
					userBId: true,
					members: { where: { userId }, select: { lastReadAt: true } },
				},
			});

			const rows = await Promise.all(conversations.map(async (c: UnreadConversationRow) => {
			const otherUserId = c.userAId === userId ? c.userBId : c.userAId;
			const lastReadAt = c.members[0]?.lastReadAt ?? null;
			const count = await prisma.message.count({
				where: {
					conversationId: c.id,
					senderId: { not: userId },
					...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
				},
			});
			return { otherUserId, count };
		}));

		return reply.code(200).send(rows.filter((r) => r.count > 0));
	});

}

