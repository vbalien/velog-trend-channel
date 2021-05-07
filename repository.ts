import { Bson, MongoClient } from "https://deno.land/x/mongo@v0.22.0/mod.ts";
import { Collection } from "https://deno.land/x/mongo@v0.22.0/src/collection/mod.ts";
import { Inject, Service } from "https://x.nest.land/di@0.1.1/mod.ts";

import { types } from "./constants.ts";
import { Article } from "./app.ts";

interface ArticleSchema extends Article {
  _id: { $oid: string };
}
export interface IRepository {
  addArticle(article: Article): Promise<void>;
  hasArticle(id: string): Promise<boolean>;
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

  async hasArticle(id: string) {
    return (
      (await this.#articles.findOne({ _id: new Bson.ObjectId(id) })) !==
      undefined
    );
  }

  async addArticle(article: Article) {
    await this.#articles.insertOne({
      ...article,
      _id: new Bson.ObjectId(article.uuid),
    });
  }
}
