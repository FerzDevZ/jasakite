---
name: docker-compose-production-hardener
description: Author enterprise, minimal, distroless Dockerfiles and production Docker Compose setups. Non-root user enforcement, read-only root filesystems, resource limits (CPU/RAM), multi-stage builds (<30MB), and healthchecks.
---

# 🐳 Production Docker & Container Hardening Standard

Deploy hardened, battle-ready containerized workloads with minimal attack surfaces and automated restart recovery.

---

## 🔒 HARDENED MULTI-STAGE DOCKERFILE TEMPLATE (NODE/TYPESCRIPT)

```dockerfile
# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --production

# Stage 2: Distroless Minimal Runner
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app

# Non-root user (UID 65532)
USER nonroot:nonroot

COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
CMD ["dist/main.js"]
```

---

## 🛡️ SECURE DOCKER COMPOSE SPECIFICATION

```yaml
version: "3.8"

services:
  app:
    image: my-app:latest
    restart: unless-stopped
    read_only: true # Prevent runtime filesystem tampering
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2048M
        reservations:
          cpus: "0.5"
          memory: 512M
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
```
