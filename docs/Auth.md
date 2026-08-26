# API Contract — ft_transcendence (Auth & Avatar)

> Généré à partir du code backend réel (routes `auth`, `login`, `register`, `avatar`).
> Objectif : source de vérité partagée entre backend (Denis) et frontend (Lucas D.) pour éviter la dérive silencieuse.
> ⚠️ Points de divergence connus signalés en bas du document — à vérifier avant de considérer ce contrat figé.

---

## Conventions générales

- **Auth** : JWT signé, transporté via cookie `token` (`httpOnly`, `secure`, `sameSite: lax`, durée 7 jours).
- **Erreurs** : forme `{ error: string }` sur (presque) toutes les routes.
- **Succès** : **pas de forme uniforme** — varie route par route (voir tableau). À harmoniser ou à documenter côté front tel quel.
- Toutes les routes d'écriture (`register`, `login`) posent le cookie `token` directement dans la réponse.

---

## POST /auth/register

**Auth requise** : non

**Body**
```ts
{
  email: string;
  password: string;
  username?: string; // si absent, dérivé de la partie avant @ de l'email
}
```

**Réponses**

| Code | Body | Cas |
|---|---|---|
| 201 | `{ msg: "User succesfully created." }` + cookie `token` posé | Succès |
| 400 | `{ error: string }` | Échec validation Zod (message = premier issue), ou email sans partie locale valide |
| 409 | `{ error: "Mail already used." }` | Email déjà pris |
| 409 | `{ error: "Username already used.", suggestions: string[] }` | Username déjà pris, suggestions générées |
| 500 | `{ error: "User creation failed" }` | Erreur serveur/DB non anticipée |

---

## POST /auth/login

**Auth requise** : non

**Body**
```ts
{
  email: string;
  password: string;
}
```

**Réponses**

| Code | Body | Cas |
|---|---|---|
| 200 | `{ msg: "Login successfull." }` + cookie `token` posé | Succès |
| 400 | `{ error: string }` | Échec validation Zod |
| 400 | `{ error: "Wrong login/password." }` | Email introuvable |
| 400 | `{ error: "Did you try to login with 42 credentials?" }` | Compte sans `password_hash` (créé via OAuth 42) |
| 400 | `{ error: "Wrong password." }` | Hash ne correspond pas |
| 500 | `{ error: "Login failed" }` | Erreur serveur non anticipée |

---

## POST /auth/logout

**Auth requise** : non (⚠️ voir note plus bas)

**Body** : aucun

**Réponses**

| Code | Body | Cas |
|---|---|---|
| 200 | `{ ok: true }` | Cookie `token` clear (que le cookie existe ou non) |

---

## GET /auth/me

**Auth requise** : oui — `preHandler: verifyAuth` (cookie `token` valide)

**Body** : aucun

**Réponses**

| Code | Body | Cas |
|---|---|---|
| 200 | `{ user: { id, email, username, avatar_url, ft_login } }` | Succès |
| 401 | *(géré par `verifyAuth`, forme non visible dans ce fichier — à documenter séparément)* | Cookie absent/invalide |
| 404 | `{ error: 'User not found' }` | JWT valide mais user supprimé en DB entretemps |

---

## GET /auth/42/callback

**Auth requise** : non (c'est l'endpoint qui authentifie)

**Flow** : redirection OAuth 42, pas d'appel `fetch` direct depuis le front — le navigateur est redirigé vers cette route par 42, puis redirigé vers `https://localhost:5173/home` en cas de succès.

**Comportement**

| Code | Body | Cas |
|---|---|---|
| — | Redirect `https://localhost:5173/home` + cookie `token` posé | Succès (création ou update user via `upsert` sur `ft_id`) |
| 502 | `{ error: 'Failed to fetch 42 profile' }` | L'appel à `api.intra.42.fr/v2/me` échoue |
| 500 | `{ error: 'Authentication failed' }` | Erreur générique — **inclut actuellement les collisions de username non gérées, voir note ci-dessous** |

---

## POST /users/me/avatar

**Auth requise** : oui — `preValidation: [app.authenticate]` (⚠️ mécanisme différent de `verifyAuth`, à vérifier — voir note)

**Body** : `multipart/form-data`, un seul fichier

**Contraintes**
- Types acceptés : `image/jpeg`, `image/png`, `image/webp` (détection réelle du contenu via `file-type`, pas juste l'extension)
- Pas de limite de taille explicite dans le code actuel

**Réponses**

| Code | Body | Cas |
|---|---|---|
| 200 | `{ avatar_url: string }` | Succès, ancien avatar supprimé du disque si existant |
| 400 | `{ error: 'No file provided' }` | Pas de fichier dans la requête |
| 415 | `{ error: 'Unsupported file type' }` | Type MIME détecté non autorisé |

---

## ⚠️ Divergences à vérifier avant de figer ce contrat

1. **`/auth/42/callback`** : collision de `username` lors de l'`upsert` non catchée spécifiquement → remonte en 500 générique. À corriger avant de documenter ce endpoint comme stable.
2. **`/users/me/avatar`** utilise `app.authenticate` (via `preValidation`) au lieu de `verifyAuth` (via `preHandler`) utilisé partout ailleurs. À confirmer : c'est le même mécanisme sous un autre nom, ou une deuxième implémentation d'auth qui a divergé ?
3. **`/auth/logout`** n'est protégé par aucun auth — à confirmer si c'est intentionnel.
4. **Pas de forme de succès uniforme** (`{msg}` / `{user}` / `{ok}` / `{avatar_url}`) — si le front (`useAuth.ts`) s'attend à un pattern `{success, error, suggestions}` uniforme, il y a un écart à vérifier avec le code réel de Lucas D.
5. **`GET /auth/me` 401** : la forme exacte de la réponse en cas d'échec `verifyAuth` n'est pas visible dans ce fichier (elle vit dans `cookiePlugin.ts`) — à ajouter ici pour que ce contrat soit vraiment complet.