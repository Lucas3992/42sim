import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("Not a valid mail adress."),
  password: z.string().min(4,  "Password must be at least 4 characters long."),
  username: z.string().trim().min(1).optional(),
  lang: z.enum(['EN', 'FR', 'NL']).optional(),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const ftProfileSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().email(),
  image: z.object({ link: z.string().nullable().optional() }).optional(),
})