# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS runner

WORKDIR /app

# Copy the standalone server output
COPY --from=builder /app/.next/standalone ./.next/standalone

# Copy public assets into the standalone directory so the server can serve them
COPY --from=builder /app/public ./.next/standalone/public

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
