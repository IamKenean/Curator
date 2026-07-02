export type MediaType = "movie" | "tv";

export type UserProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

export type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  user?: UserProfile;
  friend?: UserProfile;
};

export type Recommendation = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  reason: string | null;
  estimated_rating: number | null;
  sender_rating: number | null;
  status: "pending" | "watched";
  created_at: string;
  from_user?: UserProfile;
  to_user?: UserProfile;
};

export type Rating = {
  id: string;
  recommendation_id: string;
  user_id: string;
  rating_value: number;
  notes: string | null;
  is_favorite: boolean;
  rated_at: string;
};

export type RatedRecommendation = Recommendation & {
  rating?: Rating;
  to_user?: UserProfile;
  tmdb?: TmdbSearchResult;
};

export type UserRatedItem = RatedRecommendation & {
  rated_source: "received" | "self";
  personal_rating: number;
  rated_at_sort: string;
};

export type TrustScore = {
  user_id: string;
  friend_id: string;
  score: number;
  total_recs: number;
  updated_at: string;
  friend?: UserProfile;
};

export type TmdbSearchResult = {
  id: number;
  media_type: MediaType;
  title: string;
  year: string;
  poster_path: string | null;
};

export type AggregateFeedItem = {
  tmdb_id: number;
  media_type: MediaType;
  avg_rating?: number;
  rating_count?: number;
  match_score?: number;
  tmdb?: TmdbSearchResult;
};

export type FriendActivityFeedItem = {
  tmdb_id: number;
  media_type: MediaType;
  rating_value: number;
  rated_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  tmdb?: TmdbSearchResult;
};

export type TrustFriendPickItem = {
  friend_id: string;
  username: string;
  avatar_url: string | null;
  trust_score: number;
  tmdb_id: number;
  media_type: MediaType;
  rating_value: number;
  rated_at: string;
  tmdb?: TmdbSearchResult;
};

export type HomeFeed = {
  friendsRatedHighly: AggregateFeedItem[];
  popularThisWeek: AggregateFeedItem[];
  newFromFriends: FriendActivityFeedItem[];
  highTrustFriends: TrustFriendPickItem[];
  trustedRecommenders: AggregateFeedItem[];
  tasteMatches: AggregateFeedItem[];
};
