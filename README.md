# 42sim — Fiche d'architecture

## Backend : Fastify

**Comment ça marche :**
Fastify est un framework Node.js qui gère les routes HTTP (API REST) du projet. Il reçoit les requêtes du frontend, exécute la logique métier, et communique avec la base de données via Prisma.

**Pourquoi celui-là :**
Fastify est plus léger et plus rapide qu'Express (benchmarks officiels), avec une validation de schéma intégrée (JSON Schema) et un typage TypeScript natif — ce qui colle bien avec un stack tout-TS.

---

## Base de données : PostgreSQL

**Comment ça marche :**
PostgreSQL est le SGBD relationnel qui stocke toutes les données persistantes (comptes utilisateurs, etc.). Il tourne dans son propre conteneur Docker, séparé du backend, et communique avec lui via le réseau Docker interne.

**Pourquoi celui-là :**
SGBD open-source robuste, très répandu, avec un excellent support des types de données avancés (JSON, UUID, etc.) et une intégration native avec Prisma.

**interface graphique DB**
​```cd backend && docker compose exec backend npx prisma studio --port 5555 --browser none​```
---

## ORM : Prisma

**Comment ça marche :**
Prisma fait le lien entre le code TypeScript du backend et PostgreSQL. On définit les modèles de données dans un fichier `schema.prisma`, et Prisma génère un client TypeScript typé pour lire/écrire en base sans écrire de SQL brut.

**Pourquoi celui-là :**
Typage automatique bout en bout, migrations versionnées intégrées, et syntaxe simple comparée à écrire du SQL manuel ou d'autres ORM plus verbeux.


(**Object-Relational Mapping**  => permet de manipuler une base de données relationnelle (comme PostgreSQL) en utilisant des objets et du code dans ton langage de programmation, plutôt que d'écrire du SQL brut.
**ex:**
sans ORM, pour récupérer un utilisateur, tu écrirais du SQL directement :

​```SELECT * FROM "User" WHERE id = 1```

Avec Prisma, tu écris plutôt du TypeScript typé :

​```const user = await prisma.user.findUnique({ where: { id: 1 } })​```

Prisma traduit cet appel en SQL en arrière-plan, exécute la requête sur PostgreSQL, et te retourne un objet JavaScript/TypeScript déjà typé — avec autocomplétion et vérification de types à la compilation. 
)

---

## Frontend : Vue + TypeScript

**Comment ça marche :**
Vue gère l'interface utilisateur (composants réactifs, affichage dynamique), et communique avec le backend Fastify via des appels API (`fetch`/`axios`) pour récupérer ou envoyer des données.

**Pourquoi celui-là :**
Vue a une courbe d'apprentissage douce, une syntaxe claire (templates + composition API), et le TypeScript apporte la sécurité de typage sur toute la chaîne front/back.

Prisma génère des types automatiquement à partir de schema.prisma — sans TypeScript, cet avantage disparaît complètement, tu perds l'autocomplétion et la vérification sur tes requêtes DB.

Cohérence front/back : comme backend (Fastify) et frontend (Vue) sont tous les deux en TypeScript, on peut potentiellement partager des types (par exemple la forme d'un objet User) entre les deux, réduisant les incohérences entre ce que l'API renvoie et ce que le frontend attend.

---

## Migrations de la base de données

Quand on modifie le schéma (par exemple ajouter un champ sur les comptes utilisateurs) :

1. On édite le fichier `schema.prisma` (ajout/modif d'un champ ou modèle).
2. On lance `npx prisma migrate dev --name nom_du_changement` (migration locale).
3. Prisma compare le schéma au dernier état connu de la DB, génère un fichier SQL de migration dans `prisma/migrations/`, et l'applique directement sur la base PostgreSQL locale.
4. On lance `npx prisma migrate deploy` : il applique les migrations déjà générées sans en créer de nouvelles, pour rester cohérent avec ce qui a été testé en dev.