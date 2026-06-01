# syntax=docker.io/docker/dockerfile:1.7-labs
# See: https://stackoverflow.com/a/78110854 for above line
#
# ---- Builder Stage ----
# https://blog.platformatic.dev/we-cut-nodejs-memory-in-half
FROM platformatic/node-caged:25-slim AS builder

ARG TARGETARCH

WORKDIR /app

# Always copy package.json and lockfile first, for better layer cache
COPY package.json .
COPY package-lock.json .
# copy pkg jsons from all workspaces
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json
# remove dev dependencies and install only production dependencies
RUN npm ci --omit=dev

# Copy all source files
COPY --exclude=**/tests . .

# ---- Production Stage ----
FROM platformatic/node-caged:25-slim AS production

WORKDIR /app

# Copy everything from the builder stage
COPY --from=builder /app ./
