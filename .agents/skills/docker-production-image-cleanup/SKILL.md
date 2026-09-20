---
name: docker-production-image-cleanup
description: "Use when a production Docker server runs low on disk space due to accumulated unused images, or when configuring CI/CD pipeline cleanup jobs."
tier: local
target-stacks: ["*"]
metadata:
  origin: auto-extracted
---

# Docker Production Image Cleanup

**Extracted:** 2026-09-20 (Updated: 2026-09-21)
**Context:** Routine maintenance of a production server where CI/CD (e.g., Jenkins) continuously pushes new Docker images, leaving old untagged/unused images consuming disk space.

## Problem
In a continuous deployment pipeline, Docker environments accumulate dangling (untagged) and unused images over time. In a production environment, blindly running `docker system prune` can be dangerous if it aggressively removes volumes or networks currently in transition. Time-based filters (e.g., `until=168h`) might delete the rollback image if deployments are infrequent, or keep too many images if deployments are very frequent.

## Solution
Use a precise shell script combined with Docker formatting to sort unique Image IDs by creation date, keeping exactly the latest `N` images (e.g., current + 1 rollback version), and forcefully removing the rest.
Additionally, enforce `docker image prune -af` immediately after container execution or deployment finishes to safely purge all unreferenced layers without affecting active containers.

### Executable Code Block

```bash
# Forcefully prune all unused images (not just dangling ones) once containers are running
docker image prune -af

# Precisely keep only the 2 most recent image versions for specific repositories
# and delete everything else to guarantee rollback availability without disk bloat.
for repo in "your-repo/service-a" "your-repo/service-b"; do
    docker images "$repo" --format '{{.CreatedAt}}\t{{.ID}}' \
    | sort -r \
    | awk '{print $2}' \
    | uniq \
    | awk 'NR>2' \
    | xargs -r docker rmi -f || true
done
```

### Jenkins Pipeline Post-Execution Pattern

```groovy
post {
    always {
        // Ensure cleanup even if ephemeral staging/tests fail
        sh 'docker image prune -af || true'
    }
    success {
        sh '''
            echo "Purging unreferenced images post-deployment..."
            docker image prune -af
            
            for repo in your-repo/service-a your-repo/service-b; do
                docker images "$repo" -q | uniq | awk 'NR>2' | xargs -r docker rmi -f || true
            done
        '''
    }
}
```

## When to Use
- When server disk space alerts trigger due to `/var/lib/docker/overlay2` bloat.
- When drafting a maintenance script or Jenkins pipeline post-build job for a production Docker host.
- When you need a guaranteed N-1 rollback image regardless of deployment frequency.
- When mandating post-container execution cleanup to prevent unreferenced image layer accumulation on CI/CD runner agents.
