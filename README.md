# ENEADE FUT

A aplicação web, as APIs e a autenticação correm juntas no Next.js
(`srcs/front`). O PostgreSQL é o único serviço separado e é gerido pelo Docker
Compose.

## Executar

Na raiz do projeto:

```bash
make up
```

Acesso:
- Frontend e API: http://localhost:3000 (`/api/...` para as APIs)
- PostgreSQL: localhost:5433

## Comandos úteis

```bash
make seed
make logs
make down
make build
make web
make db-push
make db-migrate
make db-studio
```

As variáveis partilhadas ficam em `srcs/.env`. Para executar localmente sem
Docker, inicia o PostgreSQL e corre `npm run dev` dentro de `srcs/front`.
`make down` preserva os dados; `make fclean` também apaga o volume do banco.
