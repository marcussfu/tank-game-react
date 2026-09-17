# Containerises @tank/server (WS game server + REST API, sharing one port —
# the WS upgrades at `/ws` on the same HTTP server as the REST routes).
#
# Build from the REPO ROOT so the server can reach ../src/engine and ../src/net:
#   docker build -f server/Dockerfile -t tank-server .
#   docker run --rm -p 8788:8788 tank-server
#
# server/Dockerfile.dockerignore trims the context to just what the server
# imports (BuildKit reads it automatically).

FROM node:22-slim
WORKDIR /app

# Copy the whole repo before `npm ci`, not just the package.json files: `npm ci`
# in an npm-workspaces monorepo validates the lockfile against every workspace
# member, and the image's bundled npm version has been observed to reject a
# partial copy that the exact same lockfile passes fine at the repo root in CI.
# This sacrifices Docker layer caching, but this Dockerfile is local-parity-only
# (see header), not a production build optimised for rebuild speed.
COPY . .
RUN npm ci

ENV NODE_ENV=production
ENV DB_FILE=/app/server/data/app.json
ENV PORT=8788
EXPOSE 8788
CMD ["npm", "run", "--workspace", "@tank/server", "start"]
