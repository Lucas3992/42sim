# Phone App Messages

Messagerie privée entre amis, intégrée à la phone (app Messages).

## Fonctionnement

- **Depth 1** : liste des amis (en ligne d'abord, puis ordre alphabétique). Un clic ouvre le chat. Un badge rouge indique le nombre de messages non lus.
- **Depth 2** : conversation avec un ami. Bulles à gauche pour l'autre, à droite pour nous. Envoi avec le bouton ou la touche Entrée.
- **Statut des messages** : V gris = envoyé, V vert = lu.
- **Pagination** : les 20 derniers messages sont chargés, le bouton « Plus de messages » en charge 20 de plus.
- **Notifications** : badge sur l'icône Messages (total) et sur chaque ami, plus un son (`vibration.mp3`) à la réception d'un message quand le chat n'est pas ouvert.
- **Toast** : le bouton « Envoyer un message » de la notification de connexion ouvre directement le chat de l'ami.

## Règles

- On ne peut écrire qu'à un ami (statut `ACCEPTED`).
- Supprimer ou bloquer un ami supprime la conversation et tout l'historique.
- Un message est « lu » quand `message.createdAt <= lastReadAt` de l'autre personne.

## Fichiers

### Backend
- `routes/chat.ts` : WebSocket `/ws` (événements `message`, `read`, `presence`, `friendship_removed`), contrôle d'origine et limite anti-spam.
- `routes/conversations.ts` : `POST /conversations`, `GET /conversations/:id/messages` (avec `cursor`, `limit` et `peerLastReadAt`), `GET /conversations/unread`.
- `routes/friends.ts` : le blocage et la suppression d'un ami appellent `cutChat` (suppression de la conversation).
- `utils/wsUtils.ts` : `sendTo` et `sendToUser`.
- `utils/ChatUtils.ts` : `canSendTo` (amitié acceptée).

### Frontend
- `components/utils/useChat.ts` : état partagé (ami choisi, messages, non-lus), socket, envoi, lecture, pagination, son.
- `components/PhoneApps/PhoneAppMessages.vue` : aiguillage depth 1 / depth 2.
- `components/PhoneApps/Chat.vue` : bulles, input, bouton « Plus de messages ».
- `components/utils/usePhone.ts` : `openAppAt`, `togglePhone`, `badgeFor`, rafraîchissement des amis à la navigation.
- `views/Test.vue` : lit `phone.isOpen` (état partagé).

## Événements WebSocket

| Direction | Événement | Contenu |
|---|---|---|
| Client vers serveur | `message` | `conversationId`, `content` |
| Client vers serveur | `read` | `conversationId` |
| Serveur vers client | `message` | `id`, `conversationId`, `conversationType`, `senderId`, `username`, `content`, `createdAt` |
| Serveur vers client | `read` | `conversationId`, `readerId`, `lastReadAt` |
| Serveur vers client | `friendship_removed` | `userId` |
| Serveur vers client | `error` | `reason` |

## Base de données

Aucune migration : on utilise `ConversationMember.lastReadAt` (une ligne par personne et par conversation, créée à la première lecture).

## À savoir

- La limite anti-spam et le contrôle d'origine sont dans `chat.ts` (valeurs à passer en variables d'environnement avant déploiement).
- Si plus de 20 messages arrivent pendant une déconnexion, ceux du milieu ne sont pas récupérés à la reconnexion.