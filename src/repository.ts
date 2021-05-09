import { MongoClient } from "https://deno.land/x/mongo@v0.22.0/mod.ts";
import { Collection } from "https://deno.land/x/mongo@v0.22.0/src/collection/mod.ts";
import { Inject, Service } from "https://x.nest.land/di@0.1.1/mod.ts";

import { types } from "./constants.ts";
import { Article } from "./app.ts";

export interface ArticleSchema extends Article {
  _id: string;
  messageId: number;
}
export interface IRepository {
  addArticle(messageId: number, article: Article): Promise<void>;
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
}
