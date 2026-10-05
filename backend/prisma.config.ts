import { defineConfig } from 'prisma/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquante — lancer les commandes Prisma dans le conteneur')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})