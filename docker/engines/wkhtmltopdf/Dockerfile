# Stage 1: wkhtmltopdf Microservice Runner
FROM node:24-alpine
WORKDIR /app

# Install wkhtmltopdf, required fonts, and curl for healthcheck
RUN apk add --no-cache curl wkhtmltopdf ttf-dejavu fontconfig

# Copy microservice server script
COPY docker/engines/wkhtmltopdf/server.js ./server.js

# Copy fonts and assets if referenced locally
COPY libs/pdf-engine/fonts ./fonts
COPY libs/pdf-engine/img ./img

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8082

HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -f http://localhost:8082/health || exit 1

ENTRYPOINT ["node", "server.js"]
