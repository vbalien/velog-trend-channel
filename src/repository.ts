import { types } from "./constants.ts";
import { Article } from "./app.ts";
import { Collection, Inject, MongoClient, Service } from "./deps.ts";

export interface ArticleSchema {
  _id: string;
  messageId: number;
  article: Article;
}
export interface IRepository {
  addArticle(messageId: number, article: Article): Promise<void>;
  updateArticle(article: Article): Promise<void>;
  findArticle(id: string): Promise<ArticleSchema | undefined>;
}

@Service()
export class Repository implements IRepository {
  #articles: Collection<ArticleSchema>;

  constructor(
    @Inject(types.mongo)
    mongo: MongoClient
  ) {
    this.#articles = mongo.database("qiita_trend").collection("articles");
  }

  async findArticle(id: string) {
    return await this.#articles.findOne({ _id: id });
  }

  async addArticle(messageId: number, article: Article) {
    await this.#articles.insertOne({
      ...article,
      _id: article.uuid,
      messageId,
    });
  }
  async updateArticle(article: Article) {
    await this.#articles.updateOne(
      { _id: article.uuid },
      {
        $set: {
          article,
        },
      }
    );
  }
}
