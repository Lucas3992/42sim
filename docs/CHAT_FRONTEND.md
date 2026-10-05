# Chat — guide d'intégration frontend

Backend terminé et testé. Ce doc couvre tout ce qu'il faut pour brancher le front.

Base URL : `https://localhost:3000`
WebSocket : `wss://localhost:3000/ws`

---

## 1. Authentification

Le JWT est dans un cookie `httpOnly` + `secure`. Tu n'y as pas accès en JS, et c'est voulu.

**Sur chaque `fetch`** : `credentials: 'include'`, sinon le cookie ne part pas et tu prends un 401.

**Sur le WebSocket** : rien à faire. Le navigateur envoie le cookie automatiquement pendant le handshake. Si le user n'est pas authentifié, la socket ne s'ouvre pas du tout — tu reçois un `close` avec le code `1006`, jamais un `open`.

Conséquence pratique : appelle `/auth/me` avant d'ouvrir la socket. Ça te permet de distinguer « pas connecté » de « serveur injoignable », ce que le code 1006 ne dit pas.

---

## 2. REST

### `POST /conversations`

Crée un DM, ou retourne celui qui existe déjà. Idempotent — tu peux l'appeler à chaque fois que l'utilisateur clique sur un ami, sans vérifier avant.

```js
await fetch(`${API}/conversations`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ targetUserId: 1 }),
})
```

Réponse `200` :

```json
{
  "id": 2,
  "type": "DIRECT",
  "slug": null,
  "userAId": 1,
  "userBId": 2,
  "createdAt": "2026-09-25T08:38:43.312Z"
}
```

Erreurs :

| Code | Cas |
|---|---|
| `400` | `targetUserId` absent ou égal à soi-même |
| `403` | les deux users ne sont pas amis (`friendship_not_found`) |

Le 403 est normal et attendu : on ne peut ouvrir un DM qu'avec un ami accepté. À gérer dans l'UI plutôt qu'à traiter comme une erreur technique.

### `GET /conversations`

La liste pour la colonne de gauche.

```js
await fetch(`${API}/conversations`, { credentials: 'include' }).then(r => r.json())
```

```json
[
  {
    "id": 2,
    "otherUser": {
      "id": 1,
      "username": "dcasiell",
      "avatar_url": "https://cdn.intra.42.fr/users/.../dcasiell.jpg",
      "isOnline": false
    },
    "lastMessage": {
      "id": 6,
      "conversationId": 2,
      "senderId": 2,
      "content": "hello",
      "createdAt": "2026-09-25T08:39:09.900Z",
      "deletedAt": null
    }
  }
]
```

- `otherUser` est déjà résolu côté serveur — pas besoin de comparer les ids toi-même.
- `lastMessage` vaut `null` sur une conversation vide.
- **Le lobby n'est pas dans cette liste.** Voir §5.
- Tri par date de création de la conversation, pas par activité. Si l'ordre te gêne, dis-le, ça demande un champ supplémentaire côté base.

### `GET /conversations/:id/messages`

Historique paginé, pour le scroll infini.

```js
// premier chargement
await fetch(`${API}/conversations/2/messages?limit=30`, { credentials: 'include' })

// page suivante
await fetch(`${API}/conversations/2/messages?limit=30&cursor=11`, { credentials: 'include' })
```

```json
{
  "messages": [ /* … */ ],
  "nextCursor": 11
}
```

| Paramètre | Défaut | Contraintes |
|---|---|---|
| `limit` | 30 | 1 à 100, au-delà → `400` |
| `cursor` | — | l'`id` du dernier message du lot précédent |

Boucle de pagination : tu appelles sans `cursor`, tu récupères `nextCursor`, tu le passes au prochain appel. Quand `nextCursor` vaut `null`, tu es au bout de l'historique.

`403` si l'utilisateur ne participe pas à la conversation.

### `GET /conversations/lobby`

Résout la salle commune. Elle n'est pas dans `GET /conversations` (voir §5) et son `id` change selon l'environnement — passe toujours par cette route plutôt que de coder l'id en dur.

```js
await fetch(`${API}/conversations/lobby`, { credentials: 'include' }).then(r => r.json())
```

```json
{
  "id": 1,
  "type": "ROOM",
  "slug": "global-lobby",
  "userAId": null,
  "userBId": null,
  "createdAt": "2026-09-25T08:12:03.441Z"
}
```

`404` avec `lobby_not_seeded` si la salle n'existe pas en base. Ce n'est pas un bug de ton côté : le seed n'a pas tourné. Relance `make` ou `npx prisma db seed` dans le conteneur backend.

Récupère l'id une fois au montage et garde-le dans le store — il ne change pas en cours de session.

### `GET /users/:id`

Profil public d'un autre utilisateur, en lecture seule. C'est ce qui alimente le lien « voir le profil » depuis le chat.

```js
await fetch(`${API}/users/1`, { credentials: 'include' }).then(r => r.json())
```

```json
{
  "id": 1,
  "username": "test",
  "displayName": null,
  "avatar_url": null,
  "lastSeenAt": null,
  "isOnline": false
}
```

Six champs, pas un de plus — ni email, ni login 42. Si tu as besoin d'autre chose pour la page profil, demande-moi plutôt que de piocher ailleurs : cette route est publique entre utilisateurs authentifiés, ce qu'elle expose est visible par tous.

`404` si l'id n'existe pas.

À ne pas confondre avec la page « mon profil », qui est éditable et sert un autre module. Les deux vues doivent rester distinctes — c'est ce qui nous permet de défendre *User interaction* et *Standard user management* comme deux modules séparés en soutenance.

### `GET /friends`

```json
[
  {
    "id": 1,
    "username": "dcasiell",
    "displayName": null,
    "avatar_url": "…",
    "isOnline": true,
    "lastSeenAt": "2026-09-23T12:33:48.362Z"
  }
]
```

`isOnline` est lu depuis le registre de connexions en mémoire, pas depuis la base. C'est donc toujours exact à l'instant de l'appel. `lastSeenAt` vient de la base et n'est renseigné qu'après une première déconnexion.

---

## 3. WebSocket

### Ouvrir

```js
const ws = new WebSocket('wss://localhost:3000/ws')
```

Une seule socket par onglet, pour toutes les conversations. Le routage se fait par le `conversationId` dans chaque message — pas besoin d'une socket par thread.

### Envoyer

```js
ws.send(JSON.stringify({
  type: 'message',
  conversationId: 2,
  content: 'salut',
}))
```

Contraintes serveur : `content` est trimmé, entre 1 et 2000 caractères. `conversationId` doit être un entier positif. Tout le reste est rejeté.

Valide aussi côté front — pas pour la sécurité (le serveur ne fait confiance à rien), mais pour éviter un aller-retour inutile et donner un retour immédiat.

### Recevoir

Deux formes, distinguées par `type` :

```json
{
  "type": "message",
  "id": 13,
  "conversationId": 1,
  "senderId": 2,
  "username": "test",
  "content": "coucou",
  "createdAt": "2026-09-25T09:06:36.396Z"
}
```

```json
{
  "type": "error",
  "reason": "invalid payload"
}
```

Branche sur `type` dès maintenant — d'autres viendront (`typing`, `read`) quand on fera le module Advanced chat.

---

## 4. Les pièges

**Les messages arrivent en ordre décroissant** sur `GET /messages` — le plus récent en premier. Soit tu inverses le tableau, soit tu affiches en `flex-direction: column-reverse`. La seconde option gère aussi le scroll automatiquement.

**`createdAt` est une chaîne ISO**, pas un objet `Date`. `JSON.stringify` sérialise les dates en texte. Fais `new Date(msg.createdAt)` avant de formater.

**Tu reçois tes propres messages.** C'est volontaire : tu peux avoir plusieurs onglets ouverts, et ils doivent tous se mettre à jour. Affiche uniquement ce que le serveur confirme plutôt que d'ajouter le message localement à l'envoi — ça évite les doublons et les messages fantômes quand la persistance échoue.

**Ferme la socket au démontage du composant** (`onUnmounted`), sinon tu accumules des connexions et le statut en ligne ment.

**Un user peut avoir plusieurs sockets.** Le serveur diffuse à toutes. Un message envoyé depuis l'onglet A arrive aussi dans l'onglet B.

**Pas de `v-html` sur du contenu utilisateur.** Jamais. `{{ }}` échappe, c'est ce qu'on veut. C'est notre seule protection XSS.

**Gère la reconnexion.** Sur `close` avec un code autre que 1000 (fermeture normale), retente avec un backoff. Et affiche l'état de la connexion — un chat qui ne dit pas qu'il est déconnecté est pire qu'un chat cassé.

**Après une reconnexion, recharge l'historique.** Les messages envoyés pendant la coupure ne sont pas rejoués sur la socket.

**Le bfcache tue la socket.** Quand l'utilisateur navigue en arrière puis revient, Chrome restaure la page depuis le cache avant/arrière — la socket est morte, mais `close` n'a pas forcément été traité, donc ton état dit encore « connecté ». Écoute `pageshow` et reconnecte quand `event.persisted` est vrai :

```js
window.addEventListener('pageshow', (e) => {
  if (e.persisted) reconnect()
})
```

Ça se voit à l'erreur `WebSocket connection failed: Page entered Back-Forward Cache` dans la console.

---

## 5. Le lobby

C'est une conversation `ROOM` avec le slug `global-lobby`, destinée à la salle du point & click. Elle n'apparaît pas dans `GET /conversations` — cette route ne rend que les DM. Résous-la avec `GET /conversations/lobby`.

Une fois l'id récupéré, elle se comporte comme n'importe quelle conversation : même socket, même `GET /messages`, même format de payload. Seule l'autorisation diffère — tout utilisateur authentifié peut y lire et écrire, il n'y a pas de notion de membre.

Il n'y a qu'une seule salle, et on n'en crée pas d'autres. Si le besoin arrive (lobby du QCM, par exemple), c'est une discussion à avoir — pas une route à improviser.

---

## 6. Ordre de travail suggéré

1. Store Pinia `chat` : la socket, son état, les conversations, les messages par conversation
2. `GET /conversations` → la liste, et `GET /conversations/lobby` pour l'id de la salle
3. Sélection d'une conversation → `GET /messages` pour l'historique
4. Socket → append des messages entrants dans la bonne conversation
5. Envoi
6. Reconnexion et état de connexion visible
7. Scroll infini avec le curseur

Une page de debug existe sur `/debug-chat` — elle exerce toutes les routes et affiche les payloads bruts. Utile pour voir la forme exacte des réponses. **Elle est jetable, ne construis rien dessus.**

---

## 7. Frontière avec Anaïs

Pour éviter les doublons sur ce module :

- **Toi** : store Pinia, cycle de vie de la socket, appels API, composants avec état
- **Anaïs** : `components/ui/` (MessageBubble, ConversationList présentationnels), tokens, assets, et **l'accessibilité partout** — y compris dans tes fichiers (`aria-live` sur les nouveaux messages, ordre de focus, navigation clavier)

Un composant de `ui/` ne connaît ni le store ni `fetch`. S'il a besoin d'importer Pinia, c'est qu'il est mal découpé.

---

## Questions ouvertes

- Tri de `GET /conversations` par activité plutôt que par date de création
- Un bug côté front appelle `/auth/me:1` en boucle (404) — vient probablement d'une concaténation d'URL dans `useAuth.ts`, à regarder quand tu passes dessus
