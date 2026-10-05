# Refonte de l'authentification : session unique par compte

## Pourquoi cette refonte ?

Avant, un même compte pouvait être connecté dans plusieurs navigateurs en même temps. Ce n'est pas voulu pour notre jeu : un compte doit correspondre à une seule personne connectée à la fois. Nous avons aussi regroupé le code de session, qui était copié à plusieurs endroits.

## Ce qui change

1. **Un compte = une connexion.** Si quelqu'un tente de se connecter avec un compte déjà en ligne, la connexion est refusée avec le message « Ce compte est déjà connecté ailleurs ».
2. **Une seule fonction pour ouvrir la session.** Le login classique, l'inscription et le login 42 appellent tous `setSessionCookie` (dans `utils/session.ts`). Pour changer la durée de session, on ne modifie plus qu'un seul fichier.
3. **Session de 1 jour.** Avant, le cookie et le jeton JWT n'avaient pas la même durée (7 jours pour le jeton). Les deux durent maintenant 1 jour.
4. **Le logout ferme les connexions.** En se déconnectant, l'utilisateur ferme ses WebSockets et son cookie est supprimé. Il peut donc se reconnecter ailleurs tout de suite.

## Comment savoir si un compte est « en ligne » ?

Le fichier `connectionRegistry.ts` garde la liste des WebSockets ouverts pour chaque utilisateur. Un compte est en ligne tant qu'il a au moins une socket ouverte. Quand la dernière se ferme (logout, fermeture de l'onglet ou du navigateur), il est de nouveau considéré comme hors ligne.

## Le parcours selon la méthode de connexion

| Méthode | Où se fait le test « déjà connecté » | Résultat si déjà en ligne |
|---|---|---|
| Login email/mot de passe | `login.ts`, après la vérification du mot de passe | Erreur 409, affichée dans la page de login |
| Login 42 | `auth.ts`, dans `/auth/42/callback` | Redirection vers `/login?error=already_connected` |
| Inscription | Aucun test : le compte vient d'être créé | Session ouverte directement |

Le test vient après la vérification du mot de passe. Sans cela, on pourrait deviner qu'un compte est en ligne sans connaître son mot de passe.

## Fichiers modifiés

- `utils/session.ts` : nouvelle fonction `setSessionCookie`, avec une durée de 1 jour.
- `routes/login.ts` : test « déjà connecté » et appel à `setSessionCookie`.
- `routes/register.ts` : appel à `setSessionCookie` à la place de l'ancien code de jeton.
- `routes/auth.ts` : test « déjà connecté » dans le callback 42, `/auth/me` inchangé, logout qui ferme les sockets.
- `Login.vue` et les traductions : message `error.alreadyConnected` (EN/FR/NL), affiché aussi quand l'erreur arrive par l'URL (`?error=already_connected`).

## Tests effectués (tous OK)

1. Inscription : le compte est créé, l'utilisateur est connecté et le cookie est posé.
2. Même compte dans deux navigateurs (login classique) : le second est refusé avec le message.
3. Même chose avec 42 : retour sur `/login` avec le message.
4. Logout puis login ailleurs : ça passe.
5. Fermeture du navigateur sans logout puis login ailleurs : ça passe.
6. Mauvais mot de passe : l'ancien message d'erreur s'affiche, jamais « déjà connecté ».

## À retenir

- La durée de session est dans `session.ts`, à deux endroits : `expiresIn: '1d'` pour le jeton et `SESSION_MAX_AGE` (en secondes) pour le cookie. Si on la change, on modifie les deux.
- Le registre des connexions est stocké en mémoire. Si le serveur redémarre, il est vide : tout le monde est considéré hors ligne.