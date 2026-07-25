# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build application
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build notification-service --configuration=production

# Stage 3: Production image
FROM node:22-alpine AS production
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --chown=node:node --from=builder /app/dist/apps/notification-service ./dist/apps/notification-service
USER node
EXPOSE 3002 4002
CMD ["node", "dist/apps/notification-service/main.js"]
