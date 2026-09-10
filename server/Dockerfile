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

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV DB_FILE=/app/server/data/app.json
EXPOSE 8787 8788
CMD ["npm", "run", "--workspace", "@tank/server", "start"]
