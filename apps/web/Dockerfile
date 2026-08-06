# LongevIQ Web production image
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace @longeviq/web --workspace @longeviq/shared --omit=dev

FROM base AS builder
COPY . .
RUN npm ci --workspace @longeviq/web --workspace @longeviq/shared
RUN npm run build -w @longeviq/shared
RUN npm run build -w @longeviq/web

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /app/packages/shared ./packages/shared
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start"]
