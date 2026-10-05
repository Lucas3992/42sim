import type { FastifyInstance } from 'fastify'
import { prisma } from '../prisma.js'
import { add, remove, getSockets, getAllSockets, isOnline } from '../utils/connectionRegistry.js'
import type { WebSocket } from '@fastify/websocket'
import { verifyAuth } from '../utils/verifyAuth.js'
import z from 'zod'
import { canSendTo } from '../utils/ChatUtils.js'
import { sendTo, sendToUser } from '../utils/wsUtils.js'

const OFFLINE_GRACE_MS = 3000;
const offlineTimers = new Map<number, ReturnType<typeof setTimeout>>();

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;
const messageTimestamps = new Map<number, number[]>();

function isRateLimited(userId: number): boolean {
  	const now = Date.now();
	const recent = (messageTimestamps.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
	if (recent.length >= RATE_LIMIT_MAX) {
		messageTimestamps.set(userId, recent);
		return true;
	}
	recent.push(now);
	messageTimestamps.set(userId, recent);
	return false;
}

type FriendshipPair = { userAId: number; userBId: number };
type ConversationLike = {
  type: 'DIRECT' | 'ROOM';
  userAId: number | null;
  userBId: number | null;
};

const incomingSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message'),
    conversationId: z.number().int().positive(),
    content: z.string().trim().min(1).max(2000),
  }),
  z.object({
    type: z.literal('read'),
    conversationId: z.number().int().positive(),
  }),
]);

type Incoming = z.infer<typeof incomingSchema>;

function sendError(socket: WebSocket, reason: string): void {
  socket.send(JSON.stringify({ type: 'error', reason }));
}

function getPeerId(conversation: ConversationLike, userId: number): number | null {
  if (conversation.type !== 'DIRECT')
    return null;
  const peer = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
  return peer ?? null;
}

function getRecipients(conversation: ConversationLike): Set<WebSocket> {
  if (conversation.type === 'ROOM')
    return getAllSockets();
  const a = conversation.userAId;
  const b = conversation.userBId;
  if (!a || !b)
    return new Set();
  return new Set([...getSockets(a), ...getSockets(b)]);
}

async function getFriendIds(userId: number): Promise<number[]> {
  const friendships: FriendshipPair[] = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });
  return friendships.map((f) => f.userAId === userId ? f.userBId : f.userAId);
}

async function broadcastPresence(userId: number, online: boolean, lastSeenAt?: Date): Promise<void> {
  const friendIds = await getFriendIds(userId);
  const recipients = new Set<WebSocket>();

  for (const friendId of friendIds) {
    for (const socket of getSockets(friendId))
      recipients.add(socket);
  }
  sendTo(recipients, { type: 'presence', userId, isOnline: online, lastSeenAt });
}

function announcePresence(app: FastifyInstance, userId: number, online: boolean, lastSeenAt?: Date): void {
  broadcastPresence(userId, online, lastSeenAt).catch((err) => {
    app.log.error({ err, userId }, 'presence broadcast failed');
  });
}

function scheduleOfflineAnnounce(app: FastifyInstance, userId: number, lastSeenAt: Date): void {
  const timer = setTimeout(() => {
    offlineTimers.delete(userId);
    if (!isOnline(userId))
      announcePresence(app, userId, false, lastSeenAt);
  }, OFFLINE_GRACE_MS);
  offlineTimers.set(userId, timer);
}

function registerConnection(socket: WebSocket, userId: number): boolean {
  const pendingOffline = offlineTimers.get(userId);

  if (pendingOffline !== undefined) {
    clearTimeout(pendingOffline);
    offlineTimers.delete(userId);
  }
  const wasOnline = isOnline(userId);
  add(userId, socket);
  return !wasOnline && pendingOffline === undefined;
}

async function handleOpen(app: FastifyInstance, userId: number, shouldAnnounce: boolean): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });
  } catch (err) {
    app.log.error({ err, userId }, 'failed to mark user online');
  }
  if (shouldAnnounce)
    announcePresence(app, userId, true);
}

async function handleNewMessage(
  socket: WebSocket,
  userId: number,
  username: string,
  data: Extract<Incoming, { type: 'message' }>,
): Promise<void> {
  const { conversationId, content } = data;

  if (!(await canSendTo(userId, conversationId))) {
    sendError(socket, "can't send the message");
    return ;
  }
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    sendError(socket, "can't send the message");
    return ;
  }

  const message = await prisma.message.create({
    data: { conversationId, senderId: userId, content },
  });
  sendTo(getRecipients(conversation), {
    type: 'message',
    id: message.id,
    conversationId: message.conversationId,
    conversationType: conversation.type,
    senderId: message.senderId,
    username,
    content: message.content,
    createdAt: message.createdAt,
  });
}

async function handleRead(
  socket: WebSocket,
  userId: number,
  data: Extract<Incoming, { type: 'read' }>,
): Promise<void> {
  const { conversationId } = data;

  if (!(await canSendTo(userId, conversationId))) {
    sendError(socket, "can't read this conversation");
    return ;
  }
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation)
    return ;
  const peerId = getPeerId(conversation, userId);
  if (peerId === null)
    return ;

  const lastIncoming = await prisma.message.findFirst({
    where: { conversationId, senderId: { not: userId } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!lastIncoming)
    return ;

  const key = { conversationId_userId: { conversationId, userId } };
  const member = await prisma.conversationMember.findUnique({ where: key });
  if (member?.lastReadAt && member.lastReadAt >= lastIncoming.createdAt)
    return ;

  await prisma.conversationMember.upsert({
    where: key,
    update: { lastReadAt: lastIncoming.createdAt },
    create: { conversationId, userId, lastReadAt: lastIncoming.createdAt },
  });
  sendToUser(peerId, {
    type: 'read',
    conversationId,
    readerId: userId,
    lastReadAt: lastIncoming.createdAt,
  });
}

async function handleMessage(app: FastifyInstance, socket: WebSocket, userId: number, username: string, raw: Buffer): Promise<void> {
	try {
		const result = incomingSchema.safeParse(JSON.parse(raw.toString()));
		if (!result.success) {
			sendError(socket, 'invalid payload');
			return ;
		}
		if (result.data.type === 'message') {
			if (isRateLimited(userId)) {
				sendError(socket, 'rate limited');
				return ;
			}
			await handleNewMessage(socket, userId, username, result.data);
		} 
		else 
			await handleRead(socket, userId, result.data);
	} catch (err) {
		app.log.error({ err, userId }, 'ws message handler failed');
		sendError(socket, 'invalid payload');
	}
}

async function handleClose(app: FastifyInstance, socket: WebSocket, userId: number): Promise<void> {
  remove(userId, socket);
  if (isOnline(userId))
    return ;
  const lastSeenAt = new Date();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt },
    });
  } catch (err) {
    app.log.error({ err, userId }, 'failed to mark user offline');
  }
  scheduleOfflineAnnounce(app, userId, lastSeenAt);
}

export default async function chatRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true, preHandler: [verifyAuth] }, async (socket, request) => {
    const userId = request.user.userId;
    const username = request.user.username;
    const shouldAnnounce = registerConnection(socket, userId);

    socket.on('message', (raw: Buffer) => handleMessage(app, socket, userId, username, raw));
    socket.on('close', () => handleClose(app, socket, userId));
    socket.on('error', (err: Error) => app.log.error({ err, userId }, 'Error connecting to chat.'));

    await handleOpen(app, userId, shouldAnnounce);
  })
}