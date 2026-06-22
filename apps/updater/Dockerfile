# Privileged supervisor: holds the Docker socket + a bind-mount of the repo and
# performs git pull / compose build / migrate / restart on request from the app.
# Headless — no UI, internal network only, token-gated.
FROM docker:27-cli

RUN apk add --no-cache nodejs docker-cli-compose git

COPY server.mjs /server.mjs

# Override the docker image's entrypoint (docker-entrypoint.sh): it prepends `docker`
# to any CMD whose first word is a docker subcommand — and `node` collides with the
# `docker node` (swarm) command, which would make `node /server.mjs` run `docker node`.
# Setting ENTRYPOINT directly runs Node, bypassing that wrapper.
ENTRYPOINT ["node", "/server.mjs"]
