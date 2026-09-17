# Containerises @tank/server (WS game server + REST API). Local parity only —
# there is no deploy wired up in this track (see plan X6).
#
# Build from the REPO ROOT so the server can reach ../src/engine and ../src/net:
#   docker build -f server/Dockerfile -t tank-server .
#   docker run --rm -p 8787:8787 -p 8788:8788 tank-server
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
EXPOSE 8787 8788
CMD ["npm", "run", "--workspace", "@tank/server", "start"]
