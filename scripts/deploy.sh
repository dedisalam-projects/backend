#!/bin/bash
set -e

# ==========================================
# Deployment Script for Dedisalam Fullstack
# ==========================================

# Configuration
SERVER="dedisalam@172.16.254.2"
TARGET_DIR="/home/dedisalam/app"

# Get absolute path to the monorepo root (one level up from backend)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../" && pwd)"

echo "🚀 Starting Deployment to $SERVER:$TARGET_DIR..."

# 1. Ensure target directory exists
echo "📂 Preparing remote directories..."
ssh $SERVER "mkdir -p $TARGET_DIR/backend $TARGET_DIR/frontend"

# 2. Sync backend repository
echo "🔄 Syncing backend files..."
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.nx' \
    "$ROOT_DIR/backend/" "$SERVER:$TARGET_DIR/backend/"

# 3. Sync frontend repository
echo "🔄 Syncing frontend files..."
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.nx' \
    "$ROOT_DIR/frontend/" "$SERVER:$TARGET_DIR/frontend/"

# 4. Execute Docker Compose up on remote server
echo "🐳 Starting Docker Compose on remote server..."
ssh $SERVER "cd $TARGET_DIR/backend && docker-compose -f docker-compose.prod.yml up -d --build"

echo "✅ Deployment completed successfully!"
