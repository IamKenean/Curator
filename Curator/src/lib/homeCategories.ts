import type {
  AggregateFeedItem,
  FriendActivityFeedItem,
  FriendsTop10Pick,
  HomeFeed,
  Recommendation,
  TrustFriendPickItem,
  TmdbSearchResult
} from "../types";
import { formatFriendsTop10Meta } from "./userRankings";
import { getHomeFeed } from "./homeFeed";
import { getTmdbTitle } from "./tmdb";
import { getIncomingPendingRecommendations } from "./recommendations";

export type HomeCategorySlug =
  | "inbox"
  | "friends-top-10"
  | "friends-rated-highly"
  | "popular-this-week"
  | "new-from-friends"
  | "high-trust-friends"
  | "trusted-recommenders"
  | "taste-matches";

export type CategorySortOption =
  | "title_az"
  | "title_za"
  | "rating_high"
  | "rating_low"
  | "newest"
  | "oldest"
  | "trust_high"
  | "match_high"
  | "friend_az";

export type BookshelfItem = {
  id: string;
  tmdb?: TmdbSearchResult;
  subtitle?: string;
  meta?: string;
  sortTitle: string;
  sortRating: number;
  sortDate: number;
  sortTrust: number;
  sortMatch: number;
  sortFriend: string;
  sortCount: number;
  recommendation?: Recommendation & { tmdb?: TmdbSearchResult };
};

export type HomeCategoryConfig = {
  slug: HomeCategorySlug;
  title: string;
  subtitle: string;
  sortOptions: { id: CategorySortOption; label: string }[];
  defaultSort: CategorySortOption;
};

export const HOME_CATEGORIES: Record<HomeCategorySlug, HomeCategoryConfig> = {
  inbox: {
    slug: "inbox",
    title: "Inbox",
    subtitle: "Recommendations waiting for you.",
    sortOptions: [
      { id: "newest", label: "Newest" },
      { id: "oldest", label: "Oldest" },
      { id: "rating_high", label: "Estimate high" },
      { id: "rating_low", label: "Estimate low" },
      { id: "title_az", label: "Title A–Z" }
    ],
    defaultSort: "newest"
  },
  "friends-top-10": {
    slug: "friends-top-10",
    title: "In Friends' Top 10",
    subtitle: "Films your friends hold in their personal canon.",
    sortOptions: [
      { id: "rating_high", label: "Best rank" },
      { id: "title_az", label: "Title A–Z" },
      { id: "friend_az", label: "Friend A–Z" }
    ],
    defaultSort: "rating_high"
  },
  "friends-rated-highly": {
    slug: "friends-rated-highly",
    title: "Friends Rated Highly",
    subtitle: "Loved in your network — not sent to you yet.",
    sortOptions: [
      { id: "rating_high", label: "Highest rated" },
      { id: "rating_low", label: "Lowest rated" },
      { id: "title_az", label: "Title A–Z" },
      { id: "title_za", label: "Title Z–A" }
    ],
    defaultSort: "rating_high"
  },
  "popular-this-week": {
    slug: "popular-this-week",
    title: "Popular This Week",
    subtitle: "Trending on Curator.",
    sortOptions: [
      { id: "rating_high", label: "Highest rated" },
      { id: "newest", label: "Most ratings" },
      { id: "title_az", label: "Title A–Z" }
    ],
    defaultSort: "rating_high"
  },
  "new-from-friends": {
    slug: "new-from-friends",
    title: "New From Friends",
    subtitle: "Recently watched or rated in your network.",
    sortOptions: [
      { id: "newest", label: "Newest" },
      { id: "oldest", label: "Oldest" },
      { id: "rating_high", label: "Highest rated" },
      { id: "friend_az", label: "Friend A–Z" }
    ],
    defaultSort: "newest"
  },
  "high-trust-friends": {
    slug: "high-trust-friends",
    title: "Friends With High Trust Scores",
    subtitle: "Your best taste matches and their latest picks.",
    sortOptions: [
      { id: "trust_high", label: "Trust high" },
      { id: "rating_high", label: "Rating high" },
      { id: "friend_az", label: "Friend A–Z" },
      { id: "title_az", label: "Title A–Z" }
    ],
    defaultSort: "trust_high"
  },
  "trusted-recommenders": {
    slug: "trusted-recommenders",
    title: "From People With High Trust Scores",
    subtitle: "Platform-wide picks from trusted recommenders.",
    sortOptions: [
      { id: "rating_high", label: "Highest rated" },
      { id: "title_az", label: "Title A–Z" },
      { id: "title_za", label: "Title Z–A" }
    ],
    defaultSort: "rating_high"
  },
  "taste-matches": {
    slug: "taste-matches",
    title: "From People With Your Taste",
    subtitle: "Titles from users whose ratings match yours.",
    sortOptions: [
      { id: "match_high", label: "Best match" },
      { id: "rating_high", label: "Highest rated" },
      { id: "title_az", label: "Title A–Z" }
    ],
    defaultSort: "match_high"
  }
};

function titleOf(tmdb?: TmdbSearchResult) {
  return tmdb?.title ?? "";
}

function fromAggregate(item: AggregateFeedItem, prefix: string): BookshelfItem {
  return {
    id: `${prefix}-${item.media_type}-${item.tmdb_id}`,
    tmdb: item.tmdb,
    subtitle: item.avg_rating ? `${item.avg_rating} ★ avg` : undefined,
    meta: item.rating_count ? `${item.rating_count} ratings` : item.match_score ? `${Math.round(item.match_score * 100)}% match` : undefined,
    sortTitle: titleOf(item.tmdb),
    sortRating: Number(item.avg_rating ?? 0),
    sortDate: 0,
    sortTrust: 0,
    sortMatch: Number(item.match_score ?? 0),
    sortFriend: "",
    sortCount: Number(item.rating_count ?? 0)
  };
}

function fromFriendActivity(item: FriendActivityFeedItem): BookshelfItem {
  return {
    id: `nff-${item.user_id}-${item.media_type}-${item.tmdb_id}-${item.rated_at}`,
    tmdb: item.tmdb,
    subtitle: `${item.rating_value} ★`,
    meta: `@${item.username}`,
    sortTitle: titleOf(item.tmdb),
    sortRating: Number(item.rating_value),
    sortDate: new Date(item.rated_at).getTime(),
    sortTrust: 0,
    sortMatch: 0,
    sortFriend: item.username,
    sortCount: 0
  };
}

function fromTrustFriend(item: TrustFriendPickItem): BookshelfItem {
  return {
    id: `htf-${item.friend_id}-${item.media_type}-${item.tmdb_id}`,
    tmdb: item.tmdb,
    subtitle: `${item.rating_value} ★`,
    meta: `@${item.username} · ${Math.round(item.trust_score * 100)}% trust`,
    sortTitle: titleOf(item.tmdb),
    sortRating: Number(item.rating_value),
    sortDate: new Date(item.rated_at).getTime(),
    sortTrust: Number(item.trust_score),
    sortMatch: 0,
    sortFriend: item.username,
    sortCount: 0
  };
}

function fromFriendsTop10(item: FriendsTop10Pick): BookshelfItem {
  const bestRank = Math.min(...item.friends.map((friend) => friend.rank_position));
  return {
    id: `ft10-${item.media_type}-${item.tmdb_id}`,
    tmdb: item.tmdb,
    subtitle:
      item.friends.length === 1 ? "In 1 friend's top 10" : `In ${item.friends.length} friends' top 10`,
    meta: formatFriendsTop10Meta(item),
    sortTitle: titleOf(item.tmdb),
    sortRating: 6 - bestRank,
    sortDate: 0,
    sortTrust: 0,
    sortMatch: 0,
    sortFriend: item.friends[0]?.username ?? "",
    sortCount: item.friends.length
  };
}

function fromInbox(item: Recommendation & { tmdb?: TmdbSearchResult }): BookshelfItem {
  return {
    id: item.id,
    tmdb: item.tmdb,
    subtitle: item.estimated_rating ? `${item.estimated_rating} ★ estimate` : undefined,
    meta: item.from_user?.username ? `@${item.from_user.username}` : undefined,
    sortTitle: titleOf(item.tmdb),
    sortRating: Number(item.estimated_rating ?? 0),
    sortDate: new Date(item.created_at).getTime(),
    sortTrust: 0,
    sortMatch: 0,
    sortFriend: item.from_user?.username ?? "",
    sortCount: 0,
    recommendation: item
  };
}

export function sortBookshelfItems(items: BookshelfItem[], sortBy: CategorySortOption) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "title_az":
        return a.sortTitle.localeCompare(b.sortTitle);
      case "title_za":
        return b.sortTitle.localeCompare(a.sortTitle);
      case "rating_high":
        return b.sortRating - a.sortRating;
      case "rating_low":
        return a.sortRating - b.sortRating || a.sortTitle.localeCompare(b.sortTitle);
      case "newest":
        return b.sortDate - a.sortDate || b.sortCount - a.sortCount || b.sortRating - a.sortRating;
      case "oldest":
        return a.sortDate - b.sortDate || a.sortTitle.localeCompare(b.sortTitle);
      case "trust_high":
        return b.sortTrust - a.sortTrust || b.sortRating - a.sortRating;
      case "match_high":
        return b.sortMatch - a.sortMatch || b.sortRating - a.sortRating;
      case "friend_az":
        return a.sortFriend.localeCompare(b.sortFriend) || a.sortTitle.localeCompare(b.sortTitle);
      default:
        return 0;
    }
  });

  return sorted;
}

function itemsForFeed(slug: HomeCategorySlug, feed: HomeFeed, inbox: (Recommendation & { tmdb?: TmdbSearchResult })[]) {
  switch (slug) {
    case "inbox":
      return inbox.map(fromInbox);
    case "friends-top-10":
      return feed.friendsTop10.map(fromFriendsTop10);
    case "friends-rated-highly":
      return feed.friendsRatedHighly.map((item) => fromAggregate(item, "frh"));
    case "popular-this-week":
      return feed.popularThisWeek.map((item) => fromAggregate(item, "pop"));
    case "new-from-friends":
      return feed.newFromFriends.map(fromFriendActivity);
    case "high-trust-friends":
      return feed.highTrustFriends.map(fromTrustFriend);
    case "trusted-recommenders":
      return feed.trustedRecommenders.map((item) => fromAggregate(item, "tr"));
    case "taste-matches":
      return feed.tasteMatches.map((item) => fromAggregate(item, "taste"));
    default:
      return [];
  }
}

export async function loadCategoryItems(userId: string, slug: HomeCategorySlug) {
  if (slug === "inbox") {
    const recommendations = await getIncomingPendingRecommendations(userId);
    const inbox = await Promise.all(
      recommendations.map(async (recommendation) => ({
        ...recommendation,
        tmdb: await getTmdbTitle(recommendation.tmdb_id, recommendation.media_type)
      }))
    );
    return itemsForFeed(slug, emptyFeed(), inbox);
  }

  const feed = await getHomeFeed(userId);
  return itemsForFeed(slug, feed, []);
}

function emptyFeed(): HomeFeed {
  return {
    friendsRatedHighly: [],
    popularThisWeek: [],
    newFromFriends: [],
    highTrustFriends: [],
    trustedRecommenders: [],
    tasteMatches: [],
    friendsTop10: []
  };
}

export function isHomeCategorySlug(value: string): value is HomeCategorySlug {
  return value in HOME_CATEGORIES;
}
