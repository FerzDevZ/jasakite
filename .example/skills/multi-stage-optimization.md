# Docker Multi-Stage Builds & BuildKit Caching Guide

## Key Optimization Flags

```dockerfile
# 1. Mount package manager cache to prevent redownloading
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# 2. Mount npm cache for Node.js
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# 3. Mount Go build cache
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -ldflags="-s -w" -o /app/server main.go
```

- `-ldflags="-s -w"` strips debugging symbols, reducing binary size by ~30-50%.
- Always copy dependency manifests (`package.json`, `go.mod`, `Cargo.toml`) before source code to utilize Docker layer caching.
