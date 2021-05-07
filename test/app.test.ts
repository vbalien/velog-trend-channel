import "https://cdn.pika.dev/@abraham/reflection@^0.7.0";
import {
  assertEquals,
  assertStringIncludes,
  assert,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { stub } from "https://deno.land/x/mock@v0.9.5/stub.ts";
import { Telegram } from "https://deno.land/x/telegram@v0.1.1/mod.ts";

import { App, Edge, TrendFeed } from "../app.ts";
import { IRepository } from "../repository.ts";

async function loadFixture(name: string): Promise<string> {
  return await Deno.readTextFile(`./test/fixture/${name}`);
}

class FakeRepository implements IRepository {
  addArticle() {
    return new Promise<void>((resolve) => {
      resolve();
    });
  }

  hasArticle() {
    return new Promise<boolean>((resolve) => {
      resolve(false);
    });
  }
}

async function makeApp(repo?: IRepository): Promise<App> {
  const app = new App(
    repo ?? new FakeRepository(),
    "testChannel",
    new Telegram("token")
  );
  stub(app, "fetchData", [await loadFixture("Qiita.html")]);
  return app;
}

Deno.test("parse JSON data from qiita page", async () => {
  const app = await makeApp();
  const expectData: TrendFeed = JSON.parse(
    await loadFixture("HomeArticleTrendFeed.json")
  );
  const returned: TrendFeed = await app["getFeed"]();
  assertEquals(returned, expectData);
});

Deno.test("make message", async () => {
  const app = await makeApp();
  const trendFeed: TrendFeed = JSON.parse(
    await loadFixture("HomeArticleTrendFeed.json")
  );
  const firstNode = trendFeed.trend.edges[0].node;
  const msg = app["makeMessage"](firstNode);

  assertStringIncludes(msg, firstNode.title, "Expected has title in message");
  assertStringIncludes(
    msg,
    `LGTM: ${firstNode.likesCount}`,
    "Expected has likesCount in message"
  );
  assertStringIncludes(
    msg,
    firstNode.tags.map((t) => `#${t.name}`).join(" "),
    "Expected has tags in message"
  );
});

Deno.test("send messages", async () => {
  const db = new FakeRepository();
  const app = await makeApp(db);
  const sendMessage = stub(app, "sendMessage");
  const edges: Edge[] = JSON.parse(
    await loadFixture("HomeArticleTrendFeed.json")
  ).trend.edges;
  const storedArticles: string[] = [
    edges[0].node.uuid,
    edges[10].node.uuid,
    edges[edges.length - 1].node.uuid,
  ];
  stub(db, "hasArticle", (id: string) => storedArticles.includes(id));
  await app.doCrawl();
  const calledArticleIds = sendMessage.calls.map((call) => call.args[0].uuid);

  assertEquals(edges.length - storedArticles.length, calledArticleIds.length);
  assert(!calledArticleIds.includes(storedArticles));
});
