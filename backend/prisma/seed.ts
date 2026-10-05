import { prisma } from '../src/prisma.js'
import { LOBBY_SLUG } from '../src/utils/ChatUtils.js'
import argon2 from 'argon2'

const SEED_PASSWORD = '1234'

const SEED_USERS = [
  { email: 'user1@42.sim', username: 'user1', prefLang: 'EN' as const },
  { email: 'utilisateur2@42.sim', username: 'utilisateur2', prefLang: 'FR' as const },
  { email: 'gebruiker3@42.sim', username: 'gebruiker3', prefLang: 'NL' as const },
  { email: 'guyrandom67@42.sim', username: 'guyrandom67', prefLang: 'EN' as const },
  { email: 'friend99@42.sim', username: 'friend99', prefLang: 'EN' as const },
]

async function seedUsers() {
  const password_hash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id })

  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        username: u.username,
        password_hash,
        prefLang: u.prefLang,
      },
    })
  }

  console.log(`Users: ${SEED_USERS.length} ready`)
}

async function seedLobby() {
  const lobby = await prisma.conversation.upsert({
    where: { slug: LOBBY_SLUG },
    update: {},
    create: { type: 'ROOM', slug: LOBBY_SLUG },
  })

  console.log('Lobby:', lobby.id, lobby.slug)
}

async function main() {
  await seedUsers()
  await seedLobby()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })