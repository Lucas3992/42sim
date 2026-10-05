# Update — Système d'amis (UI + recherche + seed)

## Résumé

Ajout d'un système complet pour gérer des amis dans 42sim : un sous-menu "Amis" dans le menu déroulant existant, une page pour trouver et ajouter des utilisateurs, et un jeu de comptes de test prêts à l'emploi pour ne plus avoir à créer des utilisateurs manuellement à chaque test.

---

## 1. Sous-menu "Amis" dans le header

Le menu déroulant du profil (avatar en haut à droite) a maintenant une entrée **Amis**. Cliquer dessus remplace le menu principal par un second menu, avec :

- **Ajouter un ami** → redirige vers une nouvelle page de recherche.
- **Retour** → revient au menu principal.

Le tout reste dans la même bulle déroulante, sans recharger la page.

---

## 2. Page "Ajouter un ami" (`AddFriends.vue`)

Une page dédiée avec une simple barre de recherche.

### Comment ça marche, en langage simple

Quand tu tapes dans la barre de recherche, l'appli attend un court instant (environ un quart de seconde) après ta dernière lettre tapée avant d'aller chercher des résultats. Ça évite de spammer le serveur à chaque touche pressée — on attend que tu aies fini de taper ta pensée.

Une fois cette pause passée, l'appli demande au serveur : "quels sont les 3 utilisateurs dont le nom commence par ce que l'utilisateur a tapé ?" Le serveur répond avec jusqu'à 3 profils (nom, avatar), triés par ordre alphabétique. Si tu continues à taper, l'ancienne recherche est ignorée même si sa réponse arrive en retard — seule la réponse correspondant à ta frappe la plus récente s'affiche, pour éviter les résultats qui "sautent" dans le désordre.

Chaque résultat a un bouton **Add**. Une fois cliqué :

- Le bouton se bloque immédiatement et affiche "Demande envoyée".
- Si une relation existe déjà (demande en attente, déjà amis, ou bloqué), le bouton est automatiquement verrouillé dès l'affichage du résultat — impossible d'envoyer une deuxième demande à la même personne par erreur, même en quittant et revenant sur la page.
- Si la session a expiré (déconnexion), l'appli redirige vers la page de connexion au lieu de laisser croire que la demande est partie.

Un bouton **Back** en bas de page permet de revenir à l'accueil.

---

## 3. Nouvelle route backend : recherche d'utilisateurs

Ajout d'une route `GET /users/search` côté serveur (Fastify), protégée par la même vérification d'identité que le reste du site. Elle :

- Cherche les noms d'utilisateur qui **commencent par** le texte tapé (pas juste "contiennent", pour rester pertinent).
- Retourne au maximum 3 résultats, sans jamais inclure ton propre profil dans les suggestions.
- Indique pour chacun si une relation existe déjà (en attente, ami, ou bloqué), ce qui permet à la page de verrouiller le bouton correctement.

---

## 4. Comptes de test automatiques (seed)

Pour éviter de recréer des comptes à la main à chaque test, le projet génère maintenant automatiquement 5 comptes de test dès qu'on lance `make up` ou `make re`.

| Compte | Email | Langue |
|---|---|---|
| 1 | user1@42.sim | Anglais |
| 2 | utilisateur2@42.sim | Français |
| 3 | gebruiker3@42.sim | Néerlandais |
| 4 | guyrandom67@42.sim | Anglais |
| 5 | friend99@42.sim | Anglais |

**Mot de passe pour les 5 comptes : `1234`**

Ces comptes sont créés une seule fois — relancer le projet plusieurs fois ne crée pas de doublons, les comptes existants sont simplement ignorés. Pour les régénérer manuellement sans tout redémarrer, la commande `make seed` suffit.

---

TODO LIST:

6. isOnline n'est mis à jour par rien pour l'instant — le champ existe dans le schéma, mais je n'ai vu aucune logique (websocket ou autre) qui le bascule à true/false réellement. Vu que ton projet a un dossier websocket/, c'est probablement prévu, mais si ce n'est pas branché, ton tri "en ligne en haut" affichera tout le monde hors ligne en permanence.
