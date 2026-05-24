# SilentEye Backend — Multi-stage build
# Context: monorepo root. The build stage compiles TypeScript and prunes
# dev deps; the runtime stage carries only what's needed to run the API.
#
# ngrok is OPTIONAL. By default it's installed because production currently
# routes some Teltonika GPS traffic through `7.tcp.ngrok.io` (see README).
# Once every fleet has cut over to direct TCP on Fly (ports 5000/8443/15140
# in fly.toml), rebuild with:
#   fly deploy --build-arg INSTALL_NGROK=false
# That removes the binary and shrinks the attack surface — if NGROK_AUTHTOKEN
# is ever leaked, an attacker can't open a reverse tunnel from a container
# that has no ngrok to run.

# ── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS builder

WORKDIR /app

# Reproducible install via monorepo lockfile. We copy only the manifests
# first to maximise layer caching, then run `npm ci --workspace backend`
# against the repo-root lockfile. This locks every dependency version and
# refuses to install anything not pinned in package-lock.json.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace backend --include-workspace-root=false

# Copy backend source and compile TypeScript inside the workspace
COPY backend/ ./backend/
WORKDIR /app/backend
RUN node ../node_modules/typescript/bin/tsc

# Bundle SQL schemas/migrations and seed data alongside the compiled JS
RUN cp src/db/schema.sql src/db/schema-simple.sql dist/db/ && \
    cp -r src/db/migrations dist/db/migrations && \
    cp -r src/scripts/data dist/scripts/data

# Drop dev deps from node_modules so we don't ship tsc, types, etc.
WORKDIR /app
RUN npm prune --workspace backend --omit=dev

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20.11.1-alpine3.19 AS runtime

# Build arg: set to "false" to ship without ngrok. Default keeps current
# behavior so this refactor is a no-op for ops until you opt in.
ARG INSTALL_NGROK=true

WORKDIR /app

# Conditional ngrok install. When INSTALL_NGROK=false the binary is never
# fetched and curl is never installed — the runtime image stays minimal.
RUN if [ "$INSTALL_NGROK" = "true" ]; then \
      apk add --no-cache curl && \
      curl -sSL -o /tmp/ngrok.tgz "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" && \
      tar xzf /tmp/ngrok.tgz -C /usr/local/bin && \
      rm /tmp/ngrok.tgz && \
      apk del curl; \
    fi

# Copy only what's needed at runtime from the builder stage. We do NOT
# carry over /app/backend/src (TypeScript sources), tsconfig, or any
# build tooling — the production image runs `node dist/index.js` and
# nothing else.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/package.json /app/package-lock.json ./

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

# Wrapper: auto-restart node on crash + ngrok if NGROK_AUTHTOKEN is set
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Run as non-root user
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

WORKDIR /app/backend
EXPOSE 8080 5000

CMD ["sh", "/app/start.sh"]
