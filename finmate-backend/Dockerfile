FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci

FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
