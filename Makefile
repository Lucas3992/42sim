COMPOSE = docker compose

all: up

# Construit les images sans les démarrer
build:
	$(COMPOSE) build

# pour lancer avec seed.ts (genere 5 comptes, voir readMe)
seed:
	$(COMPOSE) exec backend npx prisma db seed

# Démarre les conteneurs en arrière-plan (build automatique si besoin)
up:
	$(COMPOSE) up -d --build
	$(MAKE) seed

# Arrête et supprime les conteneurs (garde images/volumes)
down:
	$(COMPOSE) down

# Stoppe les conteneurs sans les supprimer
stop:
	$(COMPOSE) stop

# Redémarre les conteneurs existants
restart:
	$(COMPOSE) restart

# Supprime conteneurs + images + réseaux liés au projet
clean:
	$(COMPOSE) down --rmi all --remove-orphans

# Grand nettoyage : conteneurs, images, volumes, et node_modules locaux
fclean: clean
	$(COMPOSE) down -v --remove-orphans
	docker volume prune -f

# Arrêt complet + relance propre (utile après un changement de config Docker)
re: fclean up

# Affiche les logs en direct de tous les services
logs:
	$(COMPOSE) logs -f

# Liste les conteneurs du projet et leur statut
ps:
	$(COMPOSE) ps

status: ps

.PHONY: all build up down stop restart re clean fclean logs ps frontend backend status seed