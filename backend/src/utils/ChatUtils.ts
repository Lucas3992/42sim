import { prisma } from "../prisma.js";

export const LOBBY_SLUG = 'global-lobby'

export function canonicalPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export async function canSendTo(userId: number, conversationId: number): Promise<boolean> {

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId}});

    if (!conversation)
        return false;
    if (conversation.type === 'ROOM')
        return true;
    if (conversation.type === 'DIRECT')
    {
        const a = conversation.userAId;
        const b = conversation.userBId;
        if (!a || !b)
            return false;
        if (userId !== a && userId !== b)
            return false;

        const friendship = await prisma.friendship.findUnique({
              where: { userAId_userBId: { userAId: a, userBId: b } }
            });
        if (!friendship || friendship.status !== 'ACCEPTED')
            return false;
        return true;
    }
    return false;
}