FROM node:22-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY sql ./sql
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "--import", "tsx", "src/server.ts"]
