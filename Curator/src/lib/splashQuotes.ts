import { Asset } from "expo-asset";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SplashQuote = {
  quote: string;
  source: string;
};

const SEEN_QUOTES_STORAGE_KEY = "curator.splashQuotesSeen";

const quotesAsset = require("../../assets/splash-quotes.csv");

function parseCsvRow(line: string): SplashQuote | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  if (trimmed.startsWith('"')) {
    const closingQuote = trimmed.indexOf('",');
    if (closingQuote === -1) {
      return null;
    }

    const quote = trimmed.slice(1, closingQuote).replace(/""/g, '"');
    const source = trimmed.slice(closingQuote + 2).trim();
    if (!quote || !source) {
      return null;
    }

    return { quote, source };
  }

  const commaIndex = trimmed.indexOf(",");
  if (commaIndex === -1) {
    return null;
  }

  const quote = trimmed.slice(0, commaIndex).trim();
  const source = trimmed.slice(commaIndex + 1).trim();
  if (!quote || !source) {
    return null;
  }

  return { quote, source };
}

export function parseSplashQuotesCsv(text: string): SplashQuote[] {
  const lines = text.split(/\r?\n/);
  const quotes: SplashQuote[] = [];

  for (const line of lines.slice(1)) {
    const parsed = parseCsvRow(line);
    if (parsed) {
      quotes.push(parsed);
    }
  }

  return quotes;
}

export async function loadSplashQuotes(): Promise<SplashQuote[]> {
  const asset = Asset.fromModule(quotesAsset);
  await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;
  const response = await fetch(uri);
  const text = await response.text();
  const quotes = parseSplashQuotesCsv(text);

  if (quotes.length === 0) {
    throw new Error("No splash quotes found in assets/splash-quotes.csv");
  }

  return quotes;
}

export function pickRandomSplashQuote(quotes: SplashQuote[]): SplashQuote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function splashQuoteKey(quote: SplashQuote): string {
  return `${quote.source}::${quote.quote}`;
}

export async function loadSeenSplashQuoteKeys(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEEN_QUOTES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

/** Records a quote as seen (idempotent). Returns unique quotes seen count. */
export async function recordSplashQuoteSeen(quote: SplashQuote): Promise<number> {
  const key = splashQuoteKey(quote);
  const seen = await loadSeenSplashQuoteKeys();
  if (seen.includes(key)) {
    return seen.length;
  }

  const next = [...seen, key];
  await AsyncStorage.setItem(SEEN_QUOTES_STORAGE_KEY, JSON.stringify(next));
  return next.length;
}
