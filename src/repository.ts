import { types } from "./constants.ts";
import { Collection, Inject, MongoClient, Service } from "./deps.ts";
import { Post, PostSchema } from "./types.ts";

export interface IRepository {
  addPost(messageId: number, post: Post): Promise<void>;
  updatePost(post: Post): Promise<void>;
  findPost(id: string): Promise<PostSchema | undefined>;
}

@Service()
export class Repository implements IRepository {
  #posts: Collection<PostSchema>;

  constructor(
    @Inject(types.mongo)
    mongo: MongoClient
  ) {
    this.#posts = mongo.database("velog_trend").collection("posts");
  }

  async findPost(id: string) {
    return await this.#posts.findOne({ _id: id });
  }

  async addPost(messageId: number, post: Post) {
    await this.#posts.insertOne({
      _id: post.id,
      post,
      messageId,
    });
  }

  async updatePost(post: Post) {
    await this.#posts.updateOne(
      { _id: post.id },
      {
        $set: {
          post,
        },
      }
    );
  }
}
