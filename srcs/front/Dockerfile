FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --fetch-retries=3 --fetch-retry-maxtimeout=60000 || \
    (echo "npm ci failed; retrying once with cached downloads..." >&2 && \
     npm ci --no-audit --no-fund --fetch-retries=3 --fetch-retry-maxtimeout=60000)

COPY . .
RUN npm run db:generate

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
