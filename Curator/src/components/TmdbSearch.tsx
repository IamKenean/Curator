import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import { searchTmdb } from "../lib/tmdb";
import { colors, spacing } from "../theme";
import type { TmdbSearchResult } from "../types";
import { PosterCard } from "./PosterCard";
import { SearchField } from "./SearchField";

type TmdbSearchProps = {
  selected?: TmdbSearchResult | null;
  onSelect?: (item: TmdbSearchResult | null) => void;
  resultsMaxHeight?: number;
  variant?: "default" | "send";
};

export function TmdbSearch({ selected, onSelect, resultsMaxHeight, variant = "default" }: TmdbSearchProps) {
  const isSend = variant === "send";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      setError(null);

      if (query.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      searchTmdb(query)
        .then((items) => {
          if (active) {
            setResults(items);
          }
        })
        .catch((err: Error) => {
          if (active) {
            setError(err.message);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  function handleSelect(item: TmdbSearchResult) {
    Keyboard.dismiss();
    const isSame = selected?.id === item.id && selected.media_type === item.media_type;
    onSelect?.(isSame ? null : item);
  }

  if (onSelect && selected) {
    return (
      <View style={[styles.wrap, isSend && styles.wrapSend]}>
        <PosterCard item={selected} selected onPress={() => handleSelect(selected)} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, isSend && styles.wrapSend]}>
      <SearchField compact={isSend} placeholder="Movie or TV title" value={query} onChangeText={setQuery} />
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && query.trim().length >= 2 && results.length === 0 && !error ? (
        <Text style={styles.empty}>No titles found. Try another search.</Text>
      ) : null}
      {results.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={[
            isSend ? styles.resultsScrollSend : styles.resultsScroll,
            resultsMaxHeight ? { maxHeight: resultsMaxHeight } : null
          ]}
          contentContainerStyle={isSend ? styles.resultsContentSend : styles.resultsContent}
        >
          {results.map((item) => (
            <PosterCard
              key={`${item.media_type}-${item.id}`}
              item={item}
              selected={selected?.id === item.id && selected.media_type === item.media_type}
              onPress={onSelect ? () => handleSelect(item) : undefined}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md
  },
  wrapSend: {
    gap: spacing.sm
  },
  resultsScroll: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1
  },
  resultsScrollSend: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1
  },
  resultsContent: {
    gap: spacing.sm,
    padding: spacing.sm
  },
  resultsContentSend: {
    gap: spacing.xs,
    padding: spacing.xs + 2
  },
  empty: {
    color: colors.muted,
    fontSize: 14
  },
  error: {
    color: colors.accent,
    fontSize: 14
  }
});
