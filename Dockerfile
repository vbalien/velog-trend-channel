FROM hayd/deno:latest
LABEL maintainer="Jisu Kim <webmaster@alien.moe>"

WORKDIR /app

RUN set -x \
  && apk add --no-cache \
  dcron bash

RUN touch /var/log/crawl.log

RUN deno install -qA -n vr https://deno.land/x/velociraptor@1.0.0-beta.18/cli.ts

# Cache the dependencies as a layer (this is re-run only when deps.ts is modified).
# Ideally this will download and compile _all_ external files used in main.ts.
COPY src/deps.ts /app/src/
RUN deno cache src/deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD ./scripts.yml ./tsconfig.json ./
ADD ./src ./src
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN vr build

ENV MONGO_HOST="" \
  BOT_TOKEN="" \
  CHANNEL="" \
  SCHEDULE="0 * * * *"

COPY ./docker-entrypoint.sh /
ENTRYPOINT /docker-entrypoint.sh
