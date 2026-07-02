import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  RECEIVED_NOTIFICATION_TITLE,
  REMINDER_NOTIFICATION_TITLE,
  receivedNotificationBody,
  reminderNotificationBody
} from "./notificationMessages";
import type { Recommendation, TmdbSearchResult } from "../types";

const RECEIVED_IDS_KEY = "@curator/notified_received_ids";
const REMINDER_SENT_IDS_KEY = "@curator/reminded_recommendation_ids";
export const REMINDER_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

const inFlightReceived = new Set<string>();

export type InboxNotificationItem = Recommendation & {
  from_user?: { username?: string | null };
  tmdb?: TmdbSearchResult;
};

function reminderIdentifier(recommendationId: string) {
  return `reminder-${recommendationId}`;
}

function canUseNotifications() {
  return Platform.OS !== "web" && Device.isDevice;
}

async function readIdSet(key: string) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return new Set<string>();
  }

  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

async function writeIdSet(key: string, ids: Set<string>) {
  await AsyncStorage.setItem(key, JSON.stringify([...ids]));
}

export async function configureNotifications() {
  if (!canUseNotifications()) {
    return false;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });

  return true;
}

export async function ensureNotificationPermissions() {
  if (!canUseNotifications()) {
    return false;
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function notifyRecommendationReceived(item: InboxNotificationItem) {
  if (!canUseNotifications() || inFlightReceived.has(item.id)) {
    return;
  }

  inFlightReceived.add(item.id);

  try {
    const receivedIds = await readIdSet(RECEIVED_IDS_KEY);
    if (receivedIds.has(item.id)) {
      return;
    }

    const permitted = await ensureNotificationPermissions();
    if (!permitted) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `received-${item.id}`,
      content: {
        title: RECEIVED_NOTIFICATION_TITLE,
        body: receivedNotificationBody(item.id, item.from_user?.username),
        data: {
          type: "received",
          recommendationId: item.id
        }
      },
      trigger: null
    });

    receivedIds.add(item.id);
    await writeIdSet(RECEIVED_IDS_KEY, receivedIds);
  } finally {
    inFlightReceived.delete(item.id);
  }
}

export async function notifyRecommendationReminder(item: InboxNotificationItem) {
  if (!canUseNotifications()) {
    return;
  }

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-sent-${item.id}`,
    content: {
      title: REMINDER_NOTIFICATION_TITLE,
      body: reminderNotificationBody(item.id, item.from_user?.username, item.tmdb?.title),
      data: {
        type: "reminder",
        recommendationId: item.id
      }
    },
    trigger: null
  });
}

export async function scheduleRecommendationReminder(item: InboxNotificationItem, remindAt: Date) {
  if (!canUseNotifications()) {
    return;
  }

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return;
  }

  if (remindAt.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier(item.id),
    content: {
      title: REMINDER_NOTIFICATION_TITLE,
      body: reminderNotificationBody(item.id, item.from_user?.username, item.tmdb?.title),
      data: {
        type: "reminder",
        recommendationId: item.id
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt
    }
  });
}

export async function cancelRecommendationReminder(recommendationId: string) {
  if (!canUseNotifications()) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(recommendationId));
  await Notifications.cancelScheduledNotificationAsync(`reminder-sent-${recommendationId}`);
  await Notifications.cancelScheduledNotificationAsync(`received-${recommendationId}`);
}

export async function syncInboxNotifications(items: InboxNotificationItem[]) {
  if (!canUseNotifications()) {
    return;
  }

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return;
  }

  const remindedIds = await readIdSet(REMINDER_SENT_IDS_KEY);

  const pendingIds = new Set(items.map((item) => item.id));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (!notification.identifier.startsWith("reminder-") || notification.identifier.startsWith("reminder-sent-")) {
      continue;
    }

    const recommendationId = notification.identifier.slice("reminder-".length);
    if (recommendationId && !pendingIds.has(recommendationId)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  for (const item of items) {
    await notifyRecommendationReceived(item);

    const createdAt = new Date(item.created_at).getTime();
    const remindAt = createdAt + REMINDER_DELAY_MS;
    const ageMs = Date.now() - createdAt;

    if (ageMs >= REMINDER_DELAY_MS && !remindedIds.has(item.id)) {
      await notifyRecommendationReminder(item);
      remindedIds.add(item.id);
      continue;
    }

    if (ageMs < REMINDER_DELAY_MS) {
      await scheduleRecommendationReminder(item, new Date(remindAt));
    }
  }

  await writeIdSet(REMINDER_SENT_IDS_KEY, remindedIds);
}

export async function clearNotificationStateForSignOut() {
  await Promise.all([
    AsyncStorage.removeItem(RECEIVED_IDS_KEY),
    AsyncStorage.removeItem(REMINDER_SENT_IDS_KEY),
    canUseNotifications() ? Notifications.cancelAllScheduledNotificationsAsync() : Promise.resolve()
  ]);
}
