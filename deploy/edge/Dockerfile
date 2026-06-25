# LAN-facing edge: terminates TLS for trove.local (Caddy) and advertises the
# host on mDNS (Avahi) so `trove.local` resolves to this container's macvlan IP.
FROM caddy:2-alpine

RUN apk add --no-cache avahi avahi-tools dbus

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
