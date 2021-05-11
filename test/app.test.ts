import {
  assertEquals,
  assertStringIncludes,
  assert,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { stub } from "https://deno.land/x/mock@v0.9.5/stub.ts";

import { App, Edge, TrendFeed } from "../src/app.ts";
import { TelegramBot } from "../src/deps.ts";
import { ArticleSchema, IRepository } from "../src/repository.ts";

async function loadFixture(name: string): Promise<string> {
  return await Deno.readTextFile(`./test/fixture/${name}`);
}

class FakeRepository implements IRepository {
  addArticle() {
    return new Promise<void>((resolve) => {
      resolve();
    });
  }

  findArticle() {
    return new Promise<ArticleSchema | undefined>((resolve) => {
      resolve(undefined);
    });
  }

  updateArticle() {
    return new Promise<void>((resolve) => {
      resolve();
    });
  }
}

async function makeApp(repo?: IRepository): Promise<App> {
  const app = new App(
    repo ?? new FakeRepository(),
    "testChannel",
    new TelegramBot("token")
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
    firstNode.linkUrl,
    "Expected has linkUrl in message"
  );
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

Deno.test("send/edit messages", async () => {
  const db = new FakeRepository();
  const app = await makeApp(db);
  const sendMessage = stub(app, "sendMessage", () => ({ message_id: 0 }));
  const editMessage = stub(app, "editMessage");
  const edges: Edge[] = JSON.parse(
    await loadFixture("HomeArticleTrendFeed.json")
  ).trend.edges;
  const storedArticles: string[] = [
    edges[0].node.uuid,
    edges[10].node.uuid,
    edges[edges.length - 1].node.uuid,
  ];
  stub(db, "findArticle", (id: string) => {
    if (storedArticles.includes(id)) {
      const found = edges.find((e) => e.node.uuid === id);
      if (found) return { article: found.node, messageId: 0 };
      else return undefined;
    } else return undefined;
  });
  await app.doCrawl();
  const sendArticleIds = sendMessage.calls.map((call) => call.args[0].uuid);
  const editArticleIds = editMessage.calls.map((call) => call.args[1].uuid);

  assertEquals(edges.length - storedArticles.length, sendArticleIds.length);
  assertEquals(storedArticles.length, editArticleIds.length);
  assert(!sendArticleIds.includes(storedArticles));
  assertEquals(storedArticles, editArticleIds);
});
