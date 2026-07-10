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
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node packages/api/package.json ./packages/api/
COPY --chown=node:node packages/notification/package.json ./packages/notification/
COPY --chown=node:node packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev

COPY --chown=node:node --from=build /app/packages/notification/dist ./packages/notification/dist
COPY --chown=node:node --from=build /app/packages/shared/dist ./packages/shared/dist

USER node

CMD ["node", "packages/notification/dist/index.js"]
