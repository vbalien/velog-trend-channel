import { IRepository } from "./repository.ts";
import { types } from "./constants.ts";
import { equal, Inject, Service, TelegramBot } from "./deps.ts";
import { Article, TrendFeed } from "./types.ts";

export interface IApp {
  doCrawl(): Promise<void>;
}
@Service()
export class App implements IApp {
  #re =
    /<script .* data-component-name="HomeArticleTrendFeed".*?>(.*)<\/script>/g;

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

  private async editMessage(
    messageId: number,
    oldArticle: Article,
    newArticle: Article
  ) {
    const requestData = this.makeMessageRequest(newArticle);
    if (!equal(this.makeMessageRequest(oldArticle), requestData))
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
          if (found.messageId !== undefined && found.article !== undefined) {
            await this.editMessage(found.messageId, found.article, article);
            await this.repo.updateArticle(article);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
}
