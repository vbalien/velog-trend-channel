FROM hayd/deno:latest
LABEL maintainer="Jisu Kim <webmaster@alien.moe>"

WORKDIR /app

# Prefer not to run as root.
# USER deno

RUN set -x \
  && apk add --no-cache \
  dcron \
  && echo '0 * * * * cd /app && vr start' > /etc/crontabs/root

RUN deno install -qA -n vr https://deno.land/x/velociraptor@1.0.0-beta.18/cli.ts

# Cache the dependencies as a layer (this is re-run only when deps.ts is modified).
# Ideally this will download and compile _all_ external files used in main.ts.
COPY deps.ts /app
RUN deno cache deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD . /app
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

CMD crond -b -L /var/log/cron.log && tail -f /var/log/cron.log
