import { config } from 'dotenv'
import path from 'node:path'
config({ path: path.resolve(__dirname, '../.env') })

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
    migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})