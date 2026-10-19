FROM php:8.2-alpine
WORKDIR /app

# Install curl, libpng, libjpeg, freetype and build dependencies
RUN apk add --no-cache \
    curl \
    freetype \
    libpng \
    libjpeg-turbo \
    freetype-dev \
    libpng-dev \
    libjpeg-turbo-dev

# Configure and install PHP extensions required by dompdf
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd \
    && apk del freetype-dev libpng-dev libjpeg-turbo-dev

# Install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install dompdf 2.0.3
COPY docker/engines/dompdf/composer.json ./composer.json
RUN composer install --no-dev --optimize-autoloader --no-interaction

COPY docker/engines/dompdf/server.php ./server.php

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8084

HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -f http://localhost:8084/health || exit 1

ENTRYPOINT ["php", "-S", "0.0.0.0:8084", "server.php"]
