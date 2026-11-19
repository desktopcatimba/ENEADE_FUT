# ENEADE FUT – Next.js

O Next.js serve a interface e as APIs em `/api`. Prisma, o schema, o seed e os
dados de catálogo também pertencem a este projeto; não é necessário iniciar um
servidor Express separado.

## Executar

Com Docker, a partir da raiz do repositório, executa `make up`.

Para desenvolvimento local:

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Define `DATABASE_URL` e `JWT_SECRET` no ambiente. O endereço da aplicação é
http://localhost:3000.

## Dados e filtros de jogadores

Em `/players`, é possível filtrar por intervalo de overall e idade, escolher
ordem ascendente/descendente e paginar os resultados.
