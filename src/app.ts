import { IRepository } from "./repository.ts";
import { types } from "./constants.ts";
import { sleep } from "./utils.ts";
import { equal, Inject, Service, TelegramBot } from "./deps.ts";

export interface TrendFeed {
  trend: { edges: Edge[] };
}

export interface Edge {
  hasCodeBlock: boolean;
  isLikedByViewer: boolean;
  followingLikers: unknown[];
  node: Article;
}

export interface Article {
  encryptedId: string;
  isLikedByViewer: boolean;
  isStockableByViewer: boolean;
  isStockedByViewer: boolean;
  likesCount: number;
  linkUrl: string;
  publishedAt: string;
  title: string;
  uuid: string;
  author: {
    displayName: string;
    isUser: boolean;
    linkUrl: string;
    profileImageUrl: string;
    urlName: string;
  };
  tags: { name: string; urlName: string }[];
}

export interface IApp {
  doCrawl(): Promise<void>;
}
@Service()
export class App implements IApp {
  #re = /<script .* data-component-name="HomeArticleTrendFeed".*?>(.*)<\/script>/g;

  constructor(
    @Inject(types.IRepository)
    private repo: IRepository,

    @Inject(types.channel)
    private channel: string,

    @Inject(types.telegram)
    private telegram: TelegramBot
  ) {}

  private async fetchData() {
    const res = await fetch("https://qiita.com/");
    const data = await res.text();
    return data;
  }

  private async getFeed() {
    const data = await this.fetchData();
    const m = this.#re.exec(data);
    if (m === null) throw new Error("No matches");

    const feed: TrendFeed = JSON.parse(m[1]);
    return feed;
  }

  private makeMessage(article: Article) {
    const tags = article.tags.map((t) => `#${t.name}`).join(" ");
    return `<b>${article.title}</b>\nLGTM: ${article.likesCount}\n${tags}\n\nLink: ${article.linkUrl}`;
  }

  private makeMessageRequest(article: Article) {
    return {
      chat_id: `@${this.channel}`,
      text: this.makeMessage(article),
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "この記事を読む", url: article.linkUrl }]],
      },
    };
  }

  private async sendMessage(article: Article) {
    const requestData = this.makeMessageRequest(article);
    return await this.telegram.sendMessage(requestData);
  }

  private async editMessage(messageId: number, article: Article) {
    const requestData = this.makeMessageRequest(article);
    await this.telegram.editMessageText({
      ...requestData,
      message_id: messageId,
    });
  }

  async doCrawl() {
    const feed = await this.getFeed();
    for (const { node: article } of feed.trend.edges) {
      try {
        const found = await this.repo.findArticle(article.uuid);
        if (found === undefined) {
          const { message_id: messageId } = await this.sendMessage(article);
          await this.repo.addArticle(messageId, article);
        } else {
          if (
            found.messageId !== undefined &&
            !equal(
              this.makeMessageRequest(found),
              this.makeMessageRequest(article)
            )
          )
            await this.editMessage(found.messageId, article);
        }
        await sleep(1000);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
