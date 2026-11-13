# ENEADE FUT – API (Fase 2)

1. Copia a pasta `src/` e o `tsconfig.json` para a raiz do projeto (junto do `package.json` e da pasta `prisma/`).
2. Acrescenta ao `.env` as linhas de `.env.additions` (muda o `JWT_SECRET`).
3. No `package.json`, em `scripts`, acrescenta:
   ```json
   "dev": "tsx watch src/server.ts",
   "build": "tsc",
   "start": "node dist/server.js"
   ```
4. `npm run dev` → http://localhost:4000/health

## Rotas
| Método | Rota | Descrição |
|---|---|---|
| POST | /auth/register | nome, email, password, birthDate, phone |
| POST | /auth/login | email, password (cookie httpOnly) |
| POST | /auth/logout | |
| GET | /auth/me | utilizador + equipa |
| GET | /teams | lista de equipas |
| POST | /teams | cria a equipa (1 por utilizador) |
| GET/PATCH | /teams/me | ver / editar a minha equipa + saldo |
| GET | /teams/me/ledger | extrato de pontos |
| GET | /players | filtros: q, position, club, nationality, minOverall, maxOverall, fifaVersion, sort, order, page, limit |
| GET | /players/:id | ficha com atributos agrupados |
