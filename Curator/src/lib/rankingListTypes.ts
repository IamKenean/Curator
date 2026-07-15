import type { RankingListType } from "../types";

export type { RankingListType };

export type RankingListTypeOption = {
  id: RankingListType;
  label: string;
};

export const DEFAULT_RANKING_LIST_TYPE: RankingListType = "all-time";

export const RANKING_LIST_TYPES: RankingListTypeOption[] = [
  { id: "all-time", label: "of all time" },
  { id: "romance", label: "romance" },
  { id: "sci-fi", label: "sci fi" },
  { id: "short-films", label: "short films" },
  { id: "animated", label: "animated" },
  { id: "horror", label: "horror" },
  { id: "comedy", label: "comedy" },
  { id: "documentary", label: "documentary" }
];

export function rankingListLabel(listType: RankingListType): string {
  return RANKING_LIST_TYPES.find((option) => option.id === listType)?.label ?? "of all time";
}

export function isRankingListType(value: string): value is RankingListType {
  return RANKING_LIST_TYPES.some((option) => option.id === value);
}
