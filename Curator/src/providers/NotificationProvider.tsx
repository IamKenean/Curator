import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { createContext, useContext, useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { deliverPendingPutMeOnNotifications } from "../lib/putMeOnNotifications";
import {
  configureNotifications,
  ensureNotificationPermissions,
  notifyRecommendationReceived,
  syncInboxNotifications,
  type InboxNotificationItem
} from "../lib/notifications";
import { getIncomingPendingRecommendations } from "../lib/recommendations";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

async function attachSenderProfile(recommendation: InboxNotificationItem): Promise<InboxNotificationItem> {
  if (recommendation.from_user?.username) {
    return recommendation;
  }

  const { data } = await supabase.from("users").select("*").eq("id", recommendation.from_user_id).maybeSingle();
  return {
    ...recommendation,
    from_user: data ?? recommendation.from_user
  };
}

async function syncPendingInboxNotifications(userId: string) {
  try {
    const pending = await getIncomingPendingRecommendations(userId);
    const withSenders = await Promise.all(pending.map((item) => attachSenderProfile(item)));
    await syncInboxNotifications(withSenders);
    await deliverPendingPutMeOnNotifications(userId);
  } catch (error) {
    console.warn("Notification sync skipped:", (error as Error).message);
  }
}

const NotificationContext = createContext({ ready: false });

export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === "put_me_on_request") {
        router.push("/(tabs)/search");
        return;
      }

      router.push("/(tabs)");
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    async function handleIncomingRecommendation(recommendation: InboxNotificationItem) {
      const item = await attachSenderProfile(recommendation);
      if (!active) {
        return;
      }

      await notifyRecommendationReceived(item);
    }

    void ensureNotificationPermissions();

    const syncTimer = setTimeout(() => {
      if (active) {
        void syncPendingInboxNotifications(user.id);
      }
    }, 2000);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && active) {
        void syncPendingInboxNotifications(user.id);
      }
    });

    const channel = supabase
      .channel(`recommendations-inbox-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recommendations",
          filter: `to_user_id=eq.${user.id}`
        },
        (payload) => {
          void handleIncomingRecommendation(payload.new as InboxNotificationItem);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void supabase.removeChannel(channel);
        }
      });

    return () => {
      active = false;
      clearTimeout(syncTimer);
      appStateSubscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return <NotificationContext.Provider value={{ ready: true }}>{children}</NotificationContext.Provider>;
}

export function useNotificationsReady() {
  return useContext(NotificationContext).ready;
}
