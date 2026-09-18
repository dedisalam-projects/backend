# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build gateway --configuration=production

# Stage 3: Production image
FROM node:24-alpine AS production
RUN apk add --no-cache curl
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --chown=node:node --from=builder /app/dist/apps/gateway ./dist/apps/gateway
USER node
EXPOSE 3000 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/apps/gateway/main.js"]
