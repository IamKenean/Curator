import { env } from "./env";
import type { MediaType, TmdbSearchResult, TmdbTitleDetail } from "../types";

const baseUrl = "https://api.themoviedb.org/3";

type RawTmdbResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  tagline?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  vote_average?: number | null;
};

type RawCredits = {
  crew?: { job: string; name: string }[];
};

type RawVideos = {
  results?: { site: string; type: string; key: string }[];
};

type RawDetailResponse = RawTmdbResult & {
  credits?: RawCredits;
  videos?: RawVideos;
  created_by?: { name: string }[];
};

function normalizeResult(item: RawTmdbResult): TmdbSearchResult | null {
  if (item.media_type !== "movie" && item.media_type !== "tv") {
    return null;
  }

  const title = item.media_type === "movie" ? item.title : item.name;
  const date = item.media_type === "movie" ? item.release_date : item.first_air_date;

  if (!title) {
    return null;
  }

  return {
    id: item.id,
    media_type: item.media_type as MediaType,
    title,
    year: date ? date.slice(0, 4) : "Unknown",
    poster_path: item.poster_path,
    overview: item.overview ?? null
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!env.tmdbApiKey) {
    throw new Error("Missing TMDB_API_KEY");
  }

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const data = await tmdbFetch<{ results: RawTmdbResult[] }>("/search/multi", {
    query: trimmed,
    include_adult: "false"
  });

  return data.results.map(normalizeResult).filter((item): item is TmdbSearchResult => Boolean(item)).slice(0, 20);
}

export async function getTmdbTitle(tmdbId: number, mediaType: MediaType): Promise<TmdbSearchResult> {
  const item = await tmdbFetch<RawTmdbResult>(`/${mediaType}/${tmdbId}`);
  return (
    normalizeResult({ ...item, media_type: mediaType }) ?? {
      id: tmdbId,
      media_type: mediaType,
      title: "Unknown title",
      year: "Unknown",
      poster_path: null,
      overview: null
    }
  );
}

function directorFromDetail(item: RawDetailResponse, mediaType: MediaType): string | null {
  const crewDirector = item.credits?.crew?.find((person) => person.job === "Director")?.name;
  if (crewDirector) {
    return crewDirector;
  }

  if (mediaType === "tv") {
    return item.created_by?.[0]?.name ?? null;
  }

  return null;
}

function runtimeFromDetail(item: RawDetailResponse, mediaType: MediaType): number | null {
  if (mediaType === "movie") {
    return item.runtime ?? null;
  }

  const episodeRuntime = item.episode_run_time?.find((value) => value > 0);
  return episodeRuntime ?? null;
}

function trailerKeyFromDetail(item: RawDetailResponse): string | null {
  const trailer = item.videos?.results?.find(
    (video) => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser")
  );
  return trailer?.key ?? null;
}

export async function getTmdbTitleDetail(tmdbId: number, mediaType: MediaType): Promise<TmdbTitleDetail> {
  const item = await tmdbFetch<RawDetailResponse>(`/${mediaType}/${tmdbId}`, {
    append_to_response: "credits,videos"
  });

  const base =
    normalizeResult({ ...item, media_type: mediaType }) ?? {
      id: tmdbId,
      media_type: mediaType,
      title: "Unknown title",
      year: "Unknown",
      poster_path: null,
      overview: null
    };

  return {
    ...base,
    backdrop_path: item.backdrop_path ?? null,
    runtime_minutes: runtimeFromDetail(item, mediaType),
    tagline: item.tagline ?? null,
    director: directorFromDetail(item, mediaType),
    vote_average: item.vote_average ?? null,
    trailer_key: trailerKeyFromDetail(item)
  };
}

export async function getTrendingThisWeek(): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>("/trending/all/week");
  return data.results
    .map((item) => normalizeResult(item))
    .filter((item): item is TmdbSearchResult => Boolean(item))
    .slice(0, 20);
}

export async function getPopularMovies(): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>("/movie/popular");
  return data.results
    .map((item) => normalizeResult({ ...item, media_type: "movie" }))
    .filter((item): item is TmdbSearchResult => Boolean(item))
    .slice(0, 20);
}

export async function getPopularTv(): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<{ results: RawTmdbResult[] }>("/tv/popular");
  return data.results
    .map((item) => normalizeResult({ ...item, media_type: "tv" }))
    .filter((item): item is TmdbSearchResult => Boolean(item))
    .slice(0, 20);
}

export async function getDiscoveryTitlePool(): Promise<TmdbSearchResult[]> {
  const [trending, movies, tv] = await Promise.all([getTrendingThisWeek(), getPopularMovies(), getPopularTv()]);
  const seen = new Set<string>();
  const pool: TmdbSearchResult[] = [];

  for (const item of [...trending, ...movies, ...tv]) {
    const key = `${item.media_type}-${item.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    pool.push(item);
  }

  return pool;
}
