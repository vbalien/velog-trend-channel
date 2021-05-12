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

export interface ArticleSchema {
  _id: string;
  messageId: number;
  article: Article;
}
