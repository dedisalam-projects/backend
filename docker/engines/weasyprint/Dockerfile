FROM python:3.12-alpine
WORKDIR /app

# Install system C libraries for Cairo/Pango/GdkPixbuf, font-noto, and curl
RUN apk add --no-cache \
    curl \
    cairo \
    pango \
    gdk-pixbuf \
    libffi \
    font-noto \
    fontconfig \
    gcc \
    musl-dev \
    libffi-dev \
    cairo-dev \
    pango-dev \
    gdk-pixbuf-dev \
    py3-cffi \
    py3-pillow

# Install WeasyPrint 68.1
RUN pip install --no-cache-dir weasyprint==68.1

# Remove build tools to keep image lean
RUN apk del gcc musl-dev libffi-dev cairo-dev pango-dev gdk-pixbuf-dev

COPY docker/engines/weasyprint/server.py ./server.py

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8083

HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -f http://localhost:8083/health || exit 1

ENTRYPOINT ["python", "server.py"]
