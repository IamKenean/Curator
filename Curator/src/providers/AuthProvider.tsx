import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { supabase } from "../lib/supabase";
import { clearNotificationStateForSignOut } from "../lib/notifications";
import type { UserProfile } from "../types";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) {
      await loadProfile(session.user.id);
    }
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const { data } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Auth session check timed out")), 10000);
          })
        ]);

        if (!active) {
          return;
        }

        setSession(data.session);
        if (data.session?.user.id) {
          void loadProfile(data.session.user.id);
        }
      } catch (error) {
        console.warn("Auth init failed:", error);
        if (active) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut: async () => {
        await clearNotificationStateForSignOut();
        await supabase.auth.signOut();
      }
    }),
    [loading, profile, refreshProfile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
