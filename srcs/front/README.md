# ENEADE FUT – Frontend (Fase 3)

## Instalar
```bash
npx create-next-app@latest web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd web
npm i recharts
```
Depois copia **por cima** do projeto criado (substitui o que existir): `app/`, `components/`, `lib/`, `next.config.ts` e `.env.local.example` (renomeia para `.env.local`).
Apaga os restantes ficheiros de exemplo do `create-next-app` que sobrarem em `app/` (ex.: `favicon` pode ficar).

## Correr
1. API: `npm run dev` na pasta da API (porta 4000).
2. Frontend: `npm run dev` na pasta `web` (porta 3000) → http://localhost:3000

O browser fala só com `/api/*`, que o Next reencaminha para `API_URL` (ver `next.config.ts`). Em produção, define `API_URL` com o endereço da API.

## Páginas
`/register`, `/login`, `/dashboard` (criar/editar equipa, pontos, extrato), `/players` (pesquisa, filtros, paginação), `/players/[id]` (ficha com radar e atributos agrupados).
