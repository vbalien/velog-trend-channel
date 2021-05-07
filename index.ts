import "https://cdn.pika.dev/@abraham/reflection@^0.7.0";
import { ServiceCollection } from "https://x.nest.land/di@0.1.1/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.22.0/mod.ts";
import { Telegram } from "https://deno.land/x/telegram@v0.1.1/mod.ts";

import { Repository, IRepository } from "./repository.ts";
import { App, IApp } from "./app.ts";
import { types } from "./constants.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (BOT_TOKEN === undefined) throw new Error("BOT_TOKEN must be provided!");
const CHANNEL = Deno.env.get("CHANNEL");
if (CHANNEL === undefined) throw new Error("CHANNEL must be provided!");

const serviceCollection = new ServiceCollection();
serviceCollection.addTransientDynamic(types.mongo, async () => {
  const MONGO_HOST = Deno.env.get("MONGO_HOST") || "localhost";
  const MONGO_PORT = parseInt(Deno.env.get("MONGO_PORT") || "27017");
  const mongo = new MongoClient();
  await mongo.connect(`mongo://${MONGO_HOST}:${MONGO_PORT}`);
  return mongo;
});
serviceCollection.addTransientDynamic(
  types.telegram,
  () => new Telegram(BOT_TOKEN)
);
serviceCollection.addStatic(types.channel, CHANNEL);
serviceCollection.addTransient<IRepository>(types.IRepository, Repository);
serviceCollection.addTransient<IApp>(types.IApp, App);

const app = serviceCollection.get<IApp>(types.IApp);
await app.doCrawl();
