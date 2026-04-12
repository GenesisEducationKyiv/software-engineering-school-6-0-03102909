FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build
RUN npx esbuild prisma.config.ts --format=esm --platform=node --outfile=prisma.config.js --packages=external

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

RUN npm install --no-save prisma

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/prisma.config.js ./prisma.config.js
COPY --chown=node:node --from=build /app/public ./public

USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]