# Auth 42 (OAuth2) — ft_transcendence

Ce doc résume tout ce qu'on a fait pour brancher le bouton **"Login with 42"** sur l'API de l'intra, de la création de l'app jusqu'au cookie de session. Stack : Fastify + Prisma 7 + Postgres, tout tourne en Docker.

## 1. Créer l'application sur l'intra 42

Aller sur `profile.intra.42.fr` → onglet **API** → **Register a new app**.

Champs remplis :

| Champ | Valeur | Pourquoi |
|---|---|---|
| Name | `42_simulator` | Nom affiché sur l'écran d'autorisation |
| Application type | `42 Pedagogical Project` | Cadre du projet école |
| Public | ❌ décoché | Visibilité de l'app dans la liste publique des apps 42 — aucun rapport avec les scopes de données |
| Redirect URI | `https://localhost:3000/auth/42/callback` | URL exacte vers laquelle 42 renvoie le `code` après autorisation. Doit matcher au caractère près ce qu'on met dans le code |
| Scopes | `public` uniquement | Donne accès au profil public via `GET /v2/me` (login, email, avatar) — suffisant pour de l'auth |

⚠️ Piège : la case **"Public"** (visibilité de l'app) et le **scope "public"** (accès aux données) sont deux choses différentes qui portent le même nom.

Une fois submit → on récupère un **UID** (`client_id`) et un **SECRET** (`client_secret`).

## 2. Le flow OAuth2, en 5 étapes

1. Le frontend redirige l'utilisateur vers `GET /auth/42` (côté backend).
2. Le backend redirige vers `https://api.intra.42.fr/oauth/authorize?...` — l'utilisateur voit l'écran d'autorisation 42.
3. 42 redirige vers notre `redirect_uri` avec un `code` temporaire dans l'URL.
4. Le backend échange ce `code` contre un `access_token` via `POST https://api.intra.42.fr/oauth/token` (nécessite le `client_secret`, donc **toujours côté serveur**, jamais dans le frontend).
5. Le backend appelle `GET https://api.intra.42.fr/v2/me` avec ce token pour récupérer le profil, puis crée/retrouve l'utilisateur en base et ouvre **sa propre session** (JWT en cookie).

## 3. Dépendances installées

```bash
npm install @fastify/oauth2 @fastify/cookie @fastify/jwt bcrypt
npm install @prisma/adapter-pg
```

- `@fastify/oauth2` : gère le flow OAuth2 générique (pas de preset "42", on configure les endpoints manuellement).
- `@fastify/cookie` : lecture/écriture de cookies.
- `@fastify/jwt` : signature/vérification de notre JWT de session, configuré pour le lire directement depuis un cookie.
- `bcrypt` : hash des mots de passe pour les comptes locaux (pas encore utilisé à ce stade, prévu pour `/auth/register`).
- `@prisma/adapter-pg` : **obligatoire avec Prisma 7**, qui n'ouvre plus de connexion DB sans driver adapter explicite.

Après chaque install de dépendance : `npm approve-scripts --all` (nouvelle sécurité npm 11+ qui bloque les scripts d'install tant qu'on ne les valide pas).

## 4. Variables d'environnement (`.env` à la racine du projet)

```
FT_CLIENT_ID=uid_recupere_sur_lintra
FT_CLIENT_SECRET=secret_recupere_sur_lintra
FT_REDIRECT_URI=https://localhost:3000/auth/42/callback
JWT_SECRET=une_chaine_aleatoire_longue
DATABASE_URL=postgresql://user:password@db:5432/transcendence_db?schema=public
```

⚠️ `DATABASE_URL` utilise `db` (nom du service Docker), valable uniquement **depuis l'intérieur du réseau Docker**. Pour lancer des commandes Prisma depuis l'hôte WSL, il aurait fallu `localhost` + port exposé — on a choisi à la place d'exécuter les commandes Prisma **via `docker exec`** pour rester cohérent avec l'environnement réel.

`.env` doit être dans `.gitignore`, avec un `.env.example` (sans vraies valeurs) versionné à la place.

## 5. Schéma Prisma (`prisma/schema.prisma`)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique

  password_hash String?  // null si compte créé via 42
  ft_id         Int?     @unique // id numérique 42
  ft_login      String?  @unique // login 42
  avatar_url    String?

  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}
```

- `password_hash` nullable : un compte 42 n'a jamais de mot de passe local.
- `ft_id` / `ft_login` : identifient un compte 42 (l'id est la référence fiable, le login peut changer).
- Règle métier à vérifier **côté code** (pas gérable par Prisma) : un `User` doit toujours avoir au moins `password_hash` OU `ft_id` renseigné.

Migration appliquée avec (depuis l'intérieur du conteneur, à cause du host `db`) :

```bash
docker exec -it 42sim-backend-1 npx prisma migrate dev --name add_oauth_fields
```

## 6. `prisma.config.ts`

Depuis Prisma 7, l'URL de connexion ne va plus dans `schema.prisma` mais dans `prisma.config.ts` :

```ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

`import 'dotenv/config'` doit être la première ligne. Le `.env` doit être trouvable depuis le `cwd()` d'exécution — sinon utiliser `dotenv.config({ path: ... })` avec un chemin explicite.

## 7. Client Prisma avec driver adapter (`src/prisma.ts`)

Prisma 7 exige un adapter explicite, sinon `PrismaClientInitializationError` au premier appel :

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

## 8. Déclaration de types custom (`src/types/fastify.d.ts`)

Nécessaire car on a nommé le plugin OAuth2 `ftOAuth2` — TypeScript ne connaît pas cette propriété par défaut sur `FastifyInstance` :

```ts
import type { OAuth2Namespace } from '@fastify/oauth2';

declare module 'fastify' {
  interface FastifyInstance {
    ftOAuth2: OAuth2Namespace;
  }
}
```

## 9. `server.ts` — enregistrement des plugins

```ts
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyOauth2 from '@fastify/oauth2';
import 'dotenv/config';
import { authRoutes } from './routes/auth.js';

const app = Fastify({ logger: true });

app.register(fastifyCookie);

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET as string,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

app.register(fastifyOauth2, {
  name: 'ftOAuth2',
  scope: ['public'],
  credentials: {
    client: {
      id: process.env.FT_CLIENT_ID as string,
      secret: process.env.FT_CLIENT_SECRET as string,
    },
    auth: {
      authorizeHost: 'https://api.intra.42.fr',
      authorizePath: '/oauth/authorize',
      tokenHost: 'https://api.intra.42.fr',
      tokenPath: '/oauth/token',
    },
  },
  startRedirectPath: '/auth/42',
  callbackUri: process.env.FT_REDIRECT_URI as string,
});

app.register(authRoutes);

app.get('/', async () => {
  return { status: 'ok' };
});

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
```

`startRedirectPath: '/auth/42'` crée automatiquement la route de redirection vers l'écran d'autorisation 42 — rien à écrire pour ça.

## 10. `src/routes/auth.ts` — callback + session

```ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';

interface FtProfile {
  id: number;
  login: string;
  email: string;
  image?: { link?: string };
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/42/callback', async (request, reply) => {
    try {
      const { token } = await app.ftOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const meResponse = await fetch('https://api.intra.42.fr/v2/me', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (!meResponse.ok) {
        return reply.status(502).send({ error: 'Failed to fetch 42 profile' });
      }

      const me = await meResponse.json() as FtProfile;

      const user = await prisma.user.upsert({
        where: { ft_id: me.id },
        update: {
          ft_login: me.login,
          avatar_url: me.image?.link ?? null,
        },
        create: {
          email: me.email,
          username: me.login,
          ft_id: me.id,
          ft_login: me.login,
          avatar_url: me.image?.link ?? null,
        },
      });

      const jwtToken = app.jwt.sign(
        { userId: user.id, username: user.username },
        { expiresIn: '7d' }
      );

      reply
        .setCookie('token', jwtToken, {
          path: '/',
          httpOnly: true,
          secure: false, // repasser à true une fois en HTTPS
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        })
        .redirect('https://localhost:5173/home');
    } catch (err) {
      app.log.error(err);
      reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  app.get('/auth/me', async (request, reply) => {
    try {
      const payload = await request.jwtVerify<{ userId: string; username: string }>();

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          username: true,
          avatar_url: true,
          ft_login: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ user });
    } catch (err) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
  });
}
```

- `upsert` sur `ft_id` : gère à la fois première connexion (create) et connexions suivantes (update).
- Le JWT signé est **notre** token de session, indépendant du token 42 — c'est lui qui est posé en cookie httpOnly (protection XSS).
- `/auth/me` lit ce cookie automatiquement grâce à la config `cookie: { cookieName: 'token' }` faite sur le plugin JWT dans `server.ts`.

## 11. Bouton frontend

```vue
<button class="btn btn-secondary" @click="() => window.location.href = 'https://localhost:3000/auth/42'">
  Login with 42
</button>
```

## Résultat obtenu

Flow testé et fonctionnel de bout en bout : clic sur "Login with 42" → écran d'autorisation 42 → callback → utilisateur créé/mis à jour en base → cookie de session posé → redirection vers `/home`.

## Ce qu'il reste à faire

- `POST /auth/register` (email + password, hash avec `bcrypt`)
- `POST /auth/login`
- `POST /auth/logout` (effacer le cookie)
- Passer `secure: true` sur le cookie une fois le HTTPS en place (exigence du sujet)
- Vérifier côté code que `password_hash` OU `ft_id` est toujours renseigné à la création d'un `User`

## Galères rencontrées (pour ne pas refaire les mêmes)

- **`EACCES` sur `node_modules`** : arrive quand Docker (root) a déjà écrit dans `node_modules` avant un `npm install` en local → `sudo chown -R $USER:$USER node_modules`.
- **Décalage hôte / conteneur** : installer une dépendance sur l'hôte ne suffit pas si un volume anonyme `/app/node_modules` existe dans `docker-compose.yml` → toujours rebuild avec `docker compose up -d --build -V <service>` (le `-V` force le renouvellement du volume anonyme).
- **`DATABASE_URL` introuvable au build** : le `.env` racine n'est pas dans le contexte de build de l'image → passer `DATABASE_URL` en `build.args` dans `docker-compose.yml`, et faire `ARG` + `ENV` dans le `Dockerfile` avant `RUN npx prisma generate`.
- **Host `db` vs `localhost`** : `db:5432` n'est résolvable que depuis l'intérieur du réseau Docker → lancer les commandes Prisma via `docker exec -it <container> npx prisma ...` plutôt que depuis l'hôte.
- **Prisma 7 + driver adapter obligatoire** : `new PrismaClient()` seul ne suffit plus, il faut `@prisma/adapter-pg` sinon `PrismaClientInitializationError` au runtime.
- **TypeScript strict (`verbatimModuleSyntax`, `moduleResolution: nodenext`)** : imports de types séparés (`import type { ... }`), extensions `.js` obligatoires sur les imports relatifs (sauf si `moduleResolution: "bundler"`), et déclaration de module manuelle pour les propriétés ajoutées par les plugins Fastify nommés custom (`ftOAuth2`).
