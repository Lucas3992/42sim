import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("Not a valid mail adress."),
  password: z.string().min(12,  "Password must be at least 12 characters long."),
  username: z.string().trim().min(1).optional(),
  lang: z.enum(['EN', 'FR', 'NL']).optional(),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});