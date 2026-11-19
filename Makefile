.PHONY: help up down build logs web db-push db-migrate db-studio seed reset fclean ps

COMPOSE = docker compose --project-name eneade-fut --env-file ./srcs/.env -f ./srcs/docker-compose.yml

all: up seed
	@echo "Subindo o stack completo..."

help:
	@echo "Available commands:"
	@echo "  make up         Start all services"
	@echo "  make down       Stop and remove all services"
	@echo "  make build      Build Docker images"
	@echo "  make ps         List running containers"
	@echo "  make logs       Follow logs from all containers"
	@echo "  make web        Open a shell in the Next.js container"
	@echo "  make db-push   Run Prisma db push"
	@echo "  make db-migrate Run Prisma migration"
	@echo "  make db-studio Open Prisma Studio"
	@echo "  make seed       Run Prisma seed"
	@echo "  make reset     Restart the stack from scratch"
	@echo "  make fclean    Remove all project containers, images, volumes and networks"

up:
	docker volume create srcs_postgres_data >/dev/null
	$(COMPOSE) up --build -d

build:
	$(COMPOSE) build

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

web:
	$(COMPOSE) exec web sh

db-push:
	$(COMPOSE) exec web npm run db:push

db-migrate:
	$(COMPOSE) exec web npm run db:migrate

db-studio:
	$(COMPOSE) exec web npm run db:studio -- --hostname 0.0.0.0 --port 5555

seed:
	$(COMPOSE) exec web npm run db:seed

reset: down up

fclean:
	$(COMPOSE) down
	docker rmi -f eneade-fut-web postgres:16-alpine 2>/dev/null || true
	docker volume rm -f srcs_postgres_data 2>/dev/null || true
	@echo "Projeto limpo: containers, imagens, volumes e redes removidos."
