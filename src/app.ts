import { IRepository } from "./repository.ts";
import { types } from "./constants.ts";
import { equal, Inject, Service, TelegramBot } from "./deps.ts";
import { Post, TrendFeed } from "./types.ts";

export interface IApp {
  doCrawl(): Promise<void>;
}
@Service()
export class App implements IApp {
  constructor(
    @Inject(types.IRepository)
    private repo: IRepository,

    @Inject(types.channel)
    private channel: string,

    @Inject(types.telegram)
    private telegram: TelegramBot
  ) {}

  private async fetchData() {
    const res = await fetch("https://v2.velog.io/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        operationName: "TrendingPosts",
        variables: { limit: 24, timeframe: "week" },
        query:
          "query TrendingPosts($limit: Int, $offset: Int, $timeframe: String) {\n  trendingPosts(limit: $limit, offset: $offset, timeframe: $timeframe) {\n    id\n    title\n    short_description\n    thumbnail\n    likes\n    user {\n      id\n      username\n      profile {\n        id\n        thumbnail\n        __typename\n      }\n      __typename\n    }\n    url_slug\n    released_at\n    updated_at\n    comments_count\n    tags\n    is_private\n    __typename\n  }\n}\n",
      }),
    });
    const data = await res.json();
    return data;
  }

  private makePostUrl(post: Post) {
    return `https://velog.io/@${post.user.username}/${post.url_slug}`;
  }

  private makeTagUrl(tag: string) {
    return `<a href="https://velog.io/tags/${tag
      .split(" ")
      .join("-")}">#${tag}</a>`;
  }

  private async getFeed(): Promise<TrendFeed> {
    const res = await this.fetchData();
    return res.data;
  }

  private makeMessage(post: Post) {
    const tags = post.tags.map(this.makeTagUrl).join(" ");
    return `<b>${post.title}</b>\n❤️ ${post.likes}\n🔗 ${this.makePostUrl(
      post
    )}\n\n${tags}`;
  }

  private makeMessageRequest(post: Post) {
    return {
      chat_id: `@${this.channel}`,
      text: this.makeMessage(post),
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "읽기", url: this.makePostUrl(post) }]],
      },
    };
  }

  private async sendMessage(post: Post) {
    const requestData = this.makeMessageRequest(post);
    return await this.telegram.sendMessage(requestData);
  }

  private async editMessage(messageId: number, oldPost: Post, newPost: Post) {
    const requestData = this.makeMessageRequest(newPost);
    if (!equal(this.makeMessageRequest(oldPost), requestData))
      await this.telegram.editMessageText({
        ...requestData,
        message_id: messageId,
      });
  }

  async doCrawl() {
    const feed = await this.getFeed();
    for (const post of feed.trendingPosts) {
      try {
        const found = await this.repo.findPost(post.id);
        if (found === undefined) {
          const { message_id: messageId } = await this.sendMessage(post);
          await this.repo.addPost(messageId, post);
        } else {
          if (found.messageId !== undefined && found.post !== undefined) {
            await this.editMessage(found.messageId, found.post, post);
            await this.repo.updatePost(post);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
}
