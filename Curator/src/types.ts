export type MediaType = "movie" | "tv";

export type RankingListType =
  | "all-time"
  | "romance"
  | "sci-fi"
  | "short-films"
  | "animated"
  | "horror"
  | "comedy"
  | "documentary";

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

export type CalibrationEventType = "received" | "sent_response";

export type CalibrationEvent = {
  id: string;
  recommendation_id: string;
  viewer_user_id: string;
  friend_user_id: string;
  event_type: CalibrationEventType;
  tmdb_id: number;
  media_type: MediaType;
  estimated_rating: number | null;
  actual_rating: number;
  rec_accuracy: number;
  trust_before: number | null;
  trust_after: number;
  trust_delta_percent: number;
  reason: string | null;
  notes: string | null;
  is_favorite: boolean;
  rated_at: string;
  created_at: string;
  friend?: UserProfile;
  tmdb?: TmdbSearchResult;
};

export type CalibrationRatingSummary = {
  recAccuracyLabel: string | null;
  trustBeforeLabel: string | null;
  trustAfterLabel: string;
  trustDeltaLabel: string;
  trustDeltaTone: "up" | "down" | "flat" | "new";
  friendUsername: string;
};

export type TmdbSearchResult = {
  id: number;
  media_type: MediaType;
  title: string;
  year: string;
  poster_path: string | null;
  overview?: string | null;
};

export type TmdbTitleDetail = TmdbSearchResult & {
  backdrop_path: string | null;
  runtime_minutes: number | null;
  tagline: string | null;
  director: string | null;
  vote_average: number | null;
  trailer_key: string | null;
};

export type MockFeedMarker = {
  is_mock?: boolean;
};

export type AggregateFeedItem = MockFeedMarker & {
  tmdb_id: number;
  media_type: MediaType;
  avg_rating?: number;
  rating_count?: number;
  match_score?: number;
  tmdb?: TmdbSearchResult;
};

export type FriendActivityFeedItem = MockFeedMarker & {
  tmdb_id: number;
  media_type: MediaType;
  rating_value: number;
  rated_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  tmdb?: TmdbSearchResult;
};

export type TrustFriendPickItem = MockFeedMarker & {
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
  friendsTop10: FriendsTop10Pick[];
};

export type TitleRating = {
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  rating_value: number;
  is_favorite: boolean;
  source: "standalone" | "rec" | "import";
  rated_at: string;
  tmdb?: TmdbSearchResult;
};

export type UserRanking = {
  user_id: string;
  list_type?: RankingListType;
  tmdb_id: number;
  media_type: MediaType;
  rank_position: number;
  updated_at: string;
  rating_value?: number;
  tmdb?: TmdbSearchResult;
};

export type FriendsTop10Pick = {
  tmdb_id: number;
  media_type: MediaType;
  friends: { friend_id: string; username: string; avatar_url: string | null; rank_position: number }[];
  tmdb?: TmdbSearchResult;
};
