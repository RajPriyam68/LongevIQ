# LongevIQ API production image
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS builder
COPY . .
RUN npm ci --workspace @longeviq/api --workspace @longeviq/shared
RUN npm run build -w @longeviq/shared
RUN npm run build -w @longeviq/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared ./packages/shared
EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
