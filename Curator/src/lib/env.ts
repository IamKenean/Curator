import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  tmdbApiKey?: string;
};

const PLACEHOLDER_PATTERNS = [
  "your-project",
  "your-supabase",
  "your-tmdb",
  "example.com",
  "replace-me"
];

function clean(value: string | undefined) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Extra;

// Prefer values baked into the Expo manifest from app.config.ts.
export const env = {
  supabaseUrl: clean(extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  tmdbApiKey: clean(extra.tmdbApiKey ?? process.env.EXPO_PUBLIC_TMDB_API_KEY)
};

function looksPlaceholder(value: string) {
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

export type EnvIssue = {
  key: string;
  message: string;
};

export function getEnvIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  if (!env.supabaseUrl) {
    issues.push({
      key: "SUPABASE_URL",
      message: "Missing Supabase URL. Add EXPO_PUBLIC_SUPABASE_URL to your .env file."
    });
  } else if (!env.supabaseUrl.startsWith("https://") || !env.supabaseUrl.includes(".supabase.co")) {
    issues.push({
      key: "SUPABASE_URL",
      message: "Supabase URL looks wrong. It should look like https://abcdefgh.supabase.co"
    });
  } else if (looksPlaceholder(env.supabaseUrl)) {
    issues.push({
      key: "SUPABASE_URL",
      message: "Supabase URL is still a placeholder. Copy the real Project URL from Supabase → Settings → API."
    });
  }

  if (!env.supabaseAnonKey) {
    issues.push({
      key: "SUPABASE_ANON_KEY",
      message: "Missing Supabase anon key. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file."
    });
  } else if (!env.supabaseAnonKey.startsWith("eyJ")) {
    issues.push({
      key: "SUPABASE_ANON_KEY",
      message: "Supabase anon key looks wrong. Copy the anon public key from Supabase → Settings → API."
    });
  } else if (looksPlaceholder(env.supabaseAnonKey)) {
    issues.push({
      key: "SUPABASE_ANON_KEY",
      message: "Supabase anon key is still a placeholder."
    });
  }

  if (!env.tmdbApiKey) {
    issues.push({
      key: "TMDB_API_KEY",
      message: "Missing TMDB API key. Search will not work until you add EXPO_PUBLIC_TMDB_API_KEY."
    });
  }

  return issues;
}

export function getBlockingEnvIssues() {
  return getEnvIssues().filter((issue) => issue.key.startsWith("SUPABASE"));
}

export const missingEnv = getBlockingEnvIssues().map((issue) => issue.key);
