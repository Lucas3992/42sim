import { z } from 'zod'

export const friendRequestSchema = z.object({
  friendId: z.number().int().positive(),
})

export const friendActionParamsSchema = z.object({
  friendshipId: z.coerce.number().int().positive(),
})