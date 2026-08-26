# Auth MVP, Zod & HTTPS local — Récap des changements

Ce document résume les changements effectués depuis la mise en place du login/register jusqu'au passage en HTTPS local, et détaille la procédure que **chaque membre de l'équipe** doit suivre pour générer ses propres certificats.

---

## 1. Middleware de protection de route

**Fichier ajouté : `backend/src/utils/cookiePlugin.ts`**

Une fonction `verifyAuth` réutilisable, extraite de la logique JWT dupliquée dans les routes :

```typescript
export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        return reply.code(401).send({ msg: "Unauthorized" });
    }
}
```

Deux usages possibles :
- **Plugin encapsulé** (`authPlugin`) pour grouper des routes sous un préfixe commun (ex. `/api/protected/*`) — le hook `preHandler` s'applique automatiquement à tout ce qui est enregistré à l'intérieur.
- **Attaché route par route** via l'option `preHandler` (ex. `/auth/me`), utile quand la route ne peut pas changer de préfixe pour des raisons de contrat déjà établi avec le frontend.

**`backend/src/routes/auth.ts` — `/auth/me` refactorée**
La vérification JWT dupliquée (`try/catch` + `request.jwtVerify()`) a été retirée de la route et remplacée par `{ preHandler: verifyAuth }`. La route ne contient plus que la logique métier (recherche Prisma).

⚠️ Changement de comportement assumé : les erreurs Prisma dans `/auth/me` ne sont plus catchées localement → elles remontent en `500` générique via le handler d'erreur global de Fastify (choix délibéré, pas un oubli).

---

## 2. Validation des entrées avec Zod

**Fichier ajouté : `backend/src/schemas/auth.schema.ts`**

Deux schémas distincts, volontairement séparés malgré leurs points communs :

```typescript
export const registerSchema = z.object({
  email: z.string().email("Not a valid mail adress."),
  password: z.string().min(12, "Password must be at least 12 characters long."),
  username: z.string().trim().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});
```

**Pourquoi deux schémas séparés et pas un seul réutilisé ?**
`login` ne doit pas hériter des règles de *création* de compte (`min(12)` sur le password, format `username`) — il vérifie un mot de passe existant contre un hash, pas une nouvelle donnée. Un schéma unique aurait couplé deux responsabilités différentes.

**`username.trim().min(1)`** : empêche un username composé uniquement d'espaces (`"   "`) de passer le check `!username` côté JS et de finir stocké tel quel en DB.

**Routes mises à jour : `register.ts`, `login.ts`**
Les anciennes vérifications manuelles (`!email.includes("@")`, `password.length < 12`, cast `as RegisterBody`/`as LoginBody`) sont remplacées par `schema.safeParse(request.body)` en première ligne du handler, avec retour `400` + message d'erreur si la validation échoue.

---

## 3. Frontend — Login & Register connectés au backend

**`frontend/src/components/useAuth.ts` — deux fonctions ajoutées**

`login(email, password)` et `register(email, password, username?)`, sur le même pattern que `fetchUser`/`logout` déjà en place :
- `fetch` avec `credentials: 'include'` (obligatoire pour que le cookie httpOnly parte avec la requête cross-origin)
- Lecture de `res.ok` (fetch ne lève jamais d'exception sur un 400/409, seulement sur une vraie erreur réseau)
- Retour `{ success: boolean, error?: string, suggestions?: string[] }` exploitable par les composants appelants
- Appel à `fetchUser()` en interne après un succès, pour peupler l'état `user` partagé

Exposées dans le `return` de `useAuth()` aux côtés de `fetchUser`/`logout`.

**Nouveaux composants : `frontend/src/views/Register.vue` et `Login2.vue`**

Formulaires fonctionnels (pas de style poussé — intégration visuelle laissée à Lucas D.) :
- `v-model` sur les champs, `@submit.prevent` pour intercepter la soumission
- Appel à `register(...)` / `login(...)` de `useAuth`
- Affichage de l'erreur retournée (`errorMsg`), et des suggestions de username en cas de conflit (`Register.vue` uniquement)
- `defineEmits<{ success: [] }>()` — le composant émet `success` plutôt que de gérer lui-même la redirection, laissant `Login.vue` (Lucas) décider du comportement après un succès (fermeture de modal, redirection, etc.)

---

## 4. HTTPS local avec mkcert

### Ce qui a changé dans le code

| Fichier | Changement |
|---|---|
| `docker-compose.yml` | Ajout du volume `./certs:/app/certs:ro` sur les services `backend` et `frontend` |
| `backend/src/server.ts` | `Fastify({ https: { key, cert } })` — le serveur écoute désormais en HTTPS |
| `frontend/vite.config.ts` | `server.https: { key, cert }` — Vite sert en HTTPS |
| `backend/src/routes/*.ts` (register, login, auth) | `secure: false` → `secure: true` sur tous les `setCookie(...)` |
| `backend/src/server.ts` | CORS `origin` : `https://localhost:5173` → `https://localhost:5173` |
| `backend/src/routes/auth.ts` | Redirection callback 42 : `https://` → `https://localhost:5173/home` |
| `frontend/src/views/Login.vue`, `useAuth.ts` | Toutes les URLs `https://localhost:3000/...` → `https://localhost:3000/...` |

**Le dossier `certs/` n'est PAS versionné** (clé privée = secret, comme un `.env`). Chaque membre de l'équipe doit générer ses propres certificats en local.

---

### 🔧 Procédure à suivre par chaque membre de l'équipe

#### 1. Installer mkcert

**WSL / Ubuntu :**
```bash
sudo apt update
sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -version   # vérifier que ça répond
```

**macOS :**
```bash
brew install mkcert
brew install nss   # si vous utilisez Firefox
```

**Linux natif (Debian/Ubuntu) :**
```bash
sudo apt install -y libnss3-tools mkcert
```

#### 2. Installer la CA locale

```bash
mkcert -install
```

⚠️ **Si vous êtes sur WSL et testez depuis un navigateur Windows** (Chrome/Edge lancé depuis Windows, pas depuis WSL) : `mkcert -install` seul ne suffit pas, WSL et Windows ont des trust stores séparés. Étapes supplémentaires :

```bash
cd $(mkcert -CAROOT)
explorer.exe .
```

Ça ouvre l'explorateur Windows dans le dossier contenant `rootCA.pem`. Ensuite :
1. Faire une copie de `rootCA.pem` et la renommer en `rootCA.crt` (Windows ne reconnaît pas toujours `.pem` pour l'assistant d'import)
2. Double-clic sur `rootCA.crt` → **Install Certificate**
3. **Local Machine** (droits admin requis, popup UAC)
4. **Place all certificates in the following store** → Browse → **Trusted Root Certification Authorities**
5. Suivant → Terminer

#### 3. Générer le certificat pour localhost

Depuis la racine du repo :

```bash
mkdir -p certs
cd certs
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1
cd ..
```

Vérifier que `certs/` contient bien `localhost.pem` et `localhost-key.pem`.

#### 4. Vérifier `.gitignore`

S'assurer que le dossier est bien ignoré par Git (déjà fait dans le repo, mais à vérifier après un `git pull`) :
```
certs/
```

#### 5. Relancer les conteneurs

```bash
docker compose up -d --build
```

Vérifier dans les logs que le backend et le frontend annoncent bien une URL en `https://` :
```bash
docker compose logs --tail 30 backend frontend
```

#### 6. Test dans le navigateur

Ouvrir `https://localhost:5173` — **aucun avertissement de sécurité ne doit apparaître** si la CA a été correctement installée à l'étape 2. Si un avertissement apparaît malgré tout, revérifier l'étape 2 (CA pas installée au bon endroit / mauvais trust store).

---

## Ce qui reste à faire (Sprint 1)

- [ ] Architecture plugin Fastify — formaliser au-delà de `authPlugin` si besoin
- [ ] Vérifier que tous les postes de l'équipe ont bien régénéré leurs certificats après ce changement
- [ ] Confirmer avec Lucas D. l'intégration de `Register.vue` / `Login2.vue` dans `Login.vue`
