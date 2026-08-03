#!/bin/bash
# Script to generate a self-signed SSL certificate for local development

CERTS_DIR="docker/nginx/certs"
mkdir -p "$CERTS_DIR"

if [ ! -f "$CERTS_DIR/nginx-selfsigned.crt" ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERTS_DIR/nginx-selfsigned.key" \
        -out "$CERTS_DIR/nginx-selfsigned.crt" \
        -subj "/C=ID/ST=DKI/L=Jakarta/O=Development/CN=localhost"
    echo "SSL certificate generated at $CERTS_DIR"
else
    echo "SSL certificate already exists."
fi
