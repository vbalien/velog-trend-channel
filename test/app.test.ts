import {
  assertEquals,
  assertStringIncludes,
  assert,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";
import { stub } from "https://deno.land/x/mock@v0.9.5/stub.ts";

import { App } from "../src/app.ts";
import { TelegramBot } from "../src/deps.ts";
import { IRepository } from "../src/repository.ts";
import { PostSchema, Post, TrendFeed } from "../src/types.ts";

async function loadFixture(name: string): Promise<string> {
  return await Deno.readTextFile(`./test/fixture/${name}`);
}

class FakeRepository implements IRepository {
  addPost() {
    return new Promise<void>((resolve) => {
      resolve();
    });
  }

  findPost() {
    return new Promise<PostSchema | undefined>((resolve) => {
      resolve(undefined);
    });
  }

  updatePost() {
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
  stub(app, "fetchData", [JSON.parse(await loadFixture("data.json"))]);
  return app;
}

Deno.test("make message", async () => {
  const app = await makeApp();
  const trendFeed: TrendFeed = JSON.parse(await loadFixture("data.json")).data;
  const firstNode = trendFeed.trendingPosts[0];
  const msg = app["makeMessage"](firstNode);
  const makeTagUrl = app["makeTagUrl"];
  assertStringIncludes(msg, firstNode.title, "Expected has title in message");
  assertStringIncludes(msg, firstNode.url_slug, "Expected has url in message");
  assertStringIncludes(
    msg,
    `❤️ ${firstNode.likes}`,
    "Expected has likes in message"
  );
  assertStringIncludes(
    msg,
    firstNode.tags.map(makeTagUrl).join(" "),
    "Expected has tags in message"
  );
});

Deno.test("send/edit messages", async () => {
  const db = new FakeRepository();
  const app = await makeApp(db);
  const sendMessage = stub(app, "sendMessage", () => ({ message_id: 0 }));
  const editMessage = stub(app, "editMessage");
  const posts: Post[] = JSON.parse(await loadFixture("data.json")).data
    .trendingPosts;
  const storedPostIds: string[] = [
    posts[0].id,
    posts[10].id,
    posts[posts.length - 1].id,
  ];
  stub(db, "findPost", (id: string) => {
    if (storedPostIds.includes(id)) {
      const found = posts.find((e) => e.id === id);
      if (found) return { post: found, messageId: 0 };
      else return undefined;
    } else return undefined;
  });
  await app.doCrawl();
  const sendPostIds = sendMessage.calls.map((call) => call.args[0].id);
  const editPostIds = editMessage.calls.map((call) => call.args[1].id);

  assertEquals(posts.length - storedPostIds.length, sendPostIds.length);
  assertEquals(storedPostIds.length, editPostIds.length);
  assert(!sendPostIds.includes(storedPostIds));
  assertEquals(storedPostIds, editPostIds);
});
