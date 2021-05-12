import { Repository, IRepository } from "./repository.ts";
import { App, IApp } from "./app.ts";
import { types } from "./constants.ts";
import { MongoClient, ServiceCollection, TelegramBot } from "./deps.ts";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (BOT_TOKEN === undefined) throw new Error("BOT_TOKEN must be provided!");
const CHANNEL = Deno.env.get("CHANNEL");
if (CHANNEL === undefined) throw new Error("CHANNEL must be provided!");

// Init mongodb
const MONGO_HOST = Deno.env.get("MONGO_HOST") || "localhost";
const MONGO_PORT = parseInt(Deno.env.get("MONGO_PORT") || "27017");
const mongo = new MongoClient();
await mongo.connect(`mongo://${MONGO_HOST}:${MONGO_PORT}`);

// Init telegram
const telegram = new TelegramBot(BOT_TOKEN);

// Init DI
const serviceCollection = new ServiceCollection();
serviceCollection.addStatic(types.mongo, mongo);
serviceCollection.addStatic(types.telegram, telegram);
serviceCollection.addStatic(types.channel, CHANNEL);
serviceCollection.addTransient<IRepository>(types.IRepository, Repository);
serviceCollection.addSingleton<IApp>(types.IApp, App);

const app = serviceCollection.get<IApp>(types.IApp);
await app.doCrawl();
