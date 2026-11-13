# ENEADE FUT

Estrutura do projeto organizada em raiz + srcs:

- `srcs/back` → backend em Express + Prisma
- `srcs/front` → frontend em Next.js
- `srcs/.env` → variáveis compartilhadas do ambiente
- `srcs/docker-compose.yml` → orquestração do stack
- `Makefile` → comandos rápidos para subir/gerir a aplicação

## Executar

Na raiz do projeto:

```bash
make
```

Acesso:
- Frontend: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432

## Comandos úteis

```bash
make logs
make down
make build
make api
make web
make db-push
make db-migrate
make db-studio
make seed
```
