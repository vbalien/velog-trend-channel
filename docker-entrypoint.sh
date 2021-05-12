#!/bin/sh
set -e

echo "$SCHEDULE cd /app && vr start &>> /var/log/crawl.log" > /etc/crontabs/root

crond -b -L /var/log/crawl.log
tail -f /var/log/crawl.log