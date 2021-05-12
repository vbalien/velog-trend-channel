export interface TrendFeed {
  trendingPosts: Post[];
}

export interface Post {
  id: string;
  title: string;
  // deno-lint-ignore camelcase
  short_description: string;
  thumbnail: null | string;
  likes: number;
  user: User;
  // deno-lint-ignore camelcase
  url_slug: string;
  // deno-lint-ignore camelcase
  released_at: Date;
  // deno-lint-ignore camelcase
  updated_at: Date;
  // deno-lint-ignore camelcase
  comments_count: number;
  tags: string[];
  // deno-lint-ignore camelcase
  is_private: boolean;
  __typename: "Post";
}

export interface User {
  id: string;
  username: string;
  profile: Profile;
  __typename: "User";
}

export interface Profile {
  id: string;
  thumbnail: string;
  __typename: "UserProfile";
}

export interface PostSchema {
  _id: string;
  messageId: number;
  post: Post;
}
