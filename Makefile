.PHONY: help up down build logs api web db-push db-migrate db-studio seed reset fclean ps

COMPOSE = docker compose --env-file ./srcs/.env -f ./srcs/docker-compose.yml

all: up seed
	@echo "Subindo o stack completo..."

help:
	@echo "Available commands:"
	@echo "  make up         Start all services"
	@echo "  make down       Stop and remove all services"
	@echo "  make build      Build Docker images"
	@echo "  make ps         List running containers"
	@echo "  make logs       Follow logs from all containers"
	@echo "  make api        Open a shell in the API container"
	@echo "  make web        Open a shell in the web container"
	@echo "  make db-push   Run Prisma db push"
	@echo "  make db-migrate Run Prisma migration"
	@echo "  make db-studio Open Prisma Studio"
	@echo "  make seed       Run Prisma seed"
	@echo "  make reset     Restart the stack from scratch"
	@echo "  make fclean    Remove all project containers, images, volumes and networks"

up:
	$(COMPOSE) up --build -d

build:
	$(COMPOSE) build

down:
	$(COMPOSE) down -v

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

api:
	$(COMPOSE) exec api sh

web:
	$(COMPOSE) exec web sh

db-push:
	$(COMPOSE) exec api npx prisma db push

db-migrate:
	$(COMPOSE) exec api npx prisma migrate dev --name init

db-studio:
	$(COMPOSE) exec api npx prisma studio --hostname 0.0.0.0 --port 5555

seed:
	$(COMPOSE) exec api npm run db:seed

reset: down up

fclean:
	$(COMPOSE) down -v --remove-orphans
	docker rmi -f srcs-api srcs-web postgres:16-alpine 2>/dev/null || true
	docker volume rm -f srcs_postgres_data 2>/dev/null || true
	docker network rm -f srcs_default 2>/dev/null || true
	@echo "Projeto limpo: containers, imagens, volumes e redes removidos."
