FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/notification/package.json ./packages/notification/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate --schema packages/api/prisma/schema.prisma
RUN npm run build
RUN npx esbuild packages/api/prisma.config.ts --format=esm --platform=node --outfile=packages/api/prisma.config.js --packages=external

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node packages/api/package.json ./packages/api/
COPY --chown=node:node packages/notification/package.json ./packages/notification/
COPY --chown=node:node packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev

RUN npm install --no-save prisma

COPY --chown=node:node --from=build /app/packages/api/dist ./packages/api/dist
COPY --chown=node:node --from=build /app/packages/api/prisma ./packages/api/prisma
COPY --chown=node:node --from=build /app/packages/api/prisma.config.js ./packages/api/prisma.config.js
COPY --chown=node:node --from=build /app/packages/api/public ./packages/api/public

USER node

EXPOSE 3000

CMD ["sh", "-c", "cd packages/api && npx prisma migrate deploy && cd ../../ && node packages/api/dist/index.js"]