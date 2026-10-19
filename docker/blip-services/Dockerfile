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
RUN npx nx build blip-services --configuration=production

# Stage 3: Production image
FROM node:24-alpine AS production
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --chown=node:node --from=builder /app/dist/apps/blip-services ./dist/apps/blip-services
COPY --chown=node:node --from=builder /app/libs/pdf-engine ./libs/pdf-engine
USER node
EXPOSE 3013
CMD ["node", "dist/apps/blip-services/main.js"]
