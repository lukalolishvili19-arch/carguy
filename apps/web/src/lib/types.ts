export type Role = 'GUEST' | 'USER' | 'BUSINESS' | 'MODERATOR' | 'ADMIN';

export interface Profile {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  country?: string;
  favoriteBrands?: string[];
}

export interface Reputation {
  xp: number;
  level: number;
  isVerifiedMechanic?: boolean;
  isVerifiedBusiness?: boolean;
}

export type SubscriptionStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface BusinessSubscription {
  id: string;
  status: SubscriptionStatus;
  amount: string | number;
  currency: string;
  interval: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  lastPaidAt?: string | null;
}

export interface User {
  id: string;
  email?: string;
  username: string;
  role: Role;
  profile?: Profile;
  reputation?: Reputation;
  business?: { id: string; slug: string; name: string; verification: string } | null;
  businessSubscription?: BusinessSubscription | null;
  _count?: { followers: number; following: number; posts: number };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PostAuthor {
  id: string;
  username: string;
  role: Role;
  profile?: Profile;
  reputation?: Reputation;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  thumbnail?: string;
}

export interface Post {
  id: string;
  type: string;
  content?: string;
  location?: string;
  author: PostAuthor;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  createdAt: string;
  _count?: { comments: number; reactions: number; bookmarks: number };
}

export interface Comment {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likeCount: number;
  author: PostAuthor;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  price: string;
  currency: string;
  category: string;
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  city?: string;
  media: PostMedia[];
  favoritedByMe?: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}
