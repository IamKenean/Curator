import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import { searchTmdb } from "../lib/tmdb";
import { useTheme } from "../providers/ThemeProvider";
import type { ColorScheme } from "../theme/colorSchemes";
import { spacing } from "../theme";
import type { TmdbSearchResult } from "../types";
import { PosterCard } from "./PosterCard";
import { SearchField } from "./SearchField";

type TmdbSearchProps = {
  selected?: TmdbSearchResult | null;
  onSelect?: (item: TmdbSearchResult | null) => void;
  onSearchingChange?: (searching: boolean) => void;
  autoFocus?: boolean;
  resultsMaxHeight?: number;
  variant?: "default" | "send";
  fill?: boolean;
};

export function TmdbSearch({
  selected,
  onSelect,
  onSearchingChange,
  autoFocus = false,
  resultsMaxHeight,
  variant = "default",
  fill = false
}: TmdbSearchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  useEffect(() => {
    onSearchingChange?.(query.trim().length > 0);
  }, [query, onSearchingChange]);

  function handleSelect(item: TmdbSearchResult) {
    Keyboard.dismiss();
    const isSame = selected?.id === item.id && selected.media_type === item.media_type;
    if (!isSame) {
      setQuery("");
      onSearchingChange?.(false);
    }
    onSelect?.(isSame ? null : item);
  }

  if (onSelect && selected) {
    return (
      <View style={[styles.wrap, isSend && styles.wrapSend]}>
        <PosterCard compact={isSend} item={selected} selected onPress={() => handleSelect(selected)} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, isSend && styles.wrapSend, fill && styles.wrapFill]}>
      <SearchField compact={isSend} autoFocus={autoFocus} placeholder="Movie or TV title" value={query} onChangeText={setQuery} />
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
            fill ? styles.resultsScrollFill : resultsMaxHeight ? { maxHeight: resultsMaxHeight } : null
          ]}
          contentContainerStyle={isSend ? styles.resultsContentSend : styles.resultsContent}
        >
          {results.map((item) => (
            <PosterCard
              key={`${item.media_type}-${item.id}`}
              compact={isSend}
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

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.md
    },
    wrapSend: {
      gap: spacing.xs
    },
    wrapFill: {
      flex: 1,
      minHeight: 0
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
    resultsScrollFill: {
      flex: 1,
      minHeight: 0
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
}
