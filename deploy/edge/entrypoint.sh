#!/bin/sh
set -e

# Avahi needs a running system D-Bus. Clear stale state left by a previous run
# (a restart reuses the container's /run, and dbus refuses to start if its pid
# file or socket survive).
mkdir -p /run/dbus
rm -f /run/dbus/dbus.pid /run/dbus/system_bus_socket /run/avahi-daemon/pid
dbus-daemon --system --nofork &
# Wait for the system bus socket before starting avahi (replaces `sleep 1`).
for i in $(seq 1 30); do [ -S /run/dbus/system_bus_socket ] && break; sleep 0.1; done

# Publish this container's hostname (set to "trove" via compose `hostname:`) over
# mDNS on its macvlan interface, so other LAN devices resolve trove.local -> here.
avahi-daemon --no-chroot &

# Foreground: Caddy serves HTTPS on :443 and reverse-proxies to the app.
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
