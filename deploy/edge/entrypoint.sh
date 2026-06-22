#!/bin/sh
set -e

# Avahi needs a running system D-Bus.
mkdir -p /run/dbus
rm -f /run/dbus/pid
dbus-daemon --system --nofork &
sleep 1

# Publish this container's hostname (set to "closet" via compose `hostname:`) over
# mDNS on its macvlan interface, so other LAN devices resolve closet.local -> here.
avahi-daemon --no-chroot &

# Foreground: Caddy serves HTTPS on :443 and reverse-proxies to the app.
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
