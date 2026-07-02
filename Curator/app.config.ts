import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import type { ExpoConfig } from "expo/config";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const tmdbApiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? process.env.TMDB_API_KEY ?? "";

const appConfig: ExpoConfig = {
  name: "Curator",
  slug: "curator",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "curator",
  userInterfaceStyle: "dark",
  platforms: ["ios"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.curator.mvp",
    infoPlist: {
      NSUserNotificationUsageDescription: "Curator sends alerts when friends recommend titles and when picks are still waiting in your inbox."
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        color: "#E50914"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    tmdbApiKey
  }
};

export default appConfig;
