# Privileged supervisor: holds the Docker socket + a bind-mount of the repo and
# performs git pull / compose build / migrate / restart on request from the app.
# Headless — no UI, internal network only, token-gated.
FROM docker:27-cli

RUN apk add --no-cache nodejs docker-cli-compose git

COPY server.mjs /server.mjs

CMD ["node", "/server.mjs"]
