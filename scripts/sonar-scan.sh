#!/usr/bin/env bash
set -e

SCOPE="${1:-backend}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$SCOPE" = "root" ]; then
    TARGET_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
    TARGET_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

echo "========================================"
echo "SonarQube Scanner (Docker Runner)"
echo "Scope: $SCOPE"
echo "Target: $TARGET_DIR"
echo "========================================"

docker run --rm \
    --network infrastructure_sonar_network \
    -e SONAR_HOST_URL="http://sonarqube:9000" \
    -v "${TARGET_DIR}:/usr/src" \
    sonarsource/sonar-scanner-cli
