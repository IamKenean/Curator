import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { PUT_ME_ON_REQUEST_TITLE, putMeOnRequestNotificationBody } from "./notificationMessages";
import { ensureNotificationPermissions } from "./notifications";

const PREF_KEY_PREFIX = "curator.settings.putMeOnRequestNotifs";
const PENDING_KEY_PREFIX = "curator.putMeOnNotifs.pending";
const DELIVERED_KEY_PREFIX = "curator.putMeOnNotifs.delivered";

export type PendingPutMeOnNotification = {
  id: string;
  requestId: string;
  fromUserId: string;
  fromUsername: string;
  prompt: string;
  created_at: string;
};

function prefKey(userId: string) {
  return `${PREF_KEY_PREFIX}:${userId}`;
}

function pendingKey(userId: string) {
  return `${PENDING_KEY_PREFIX}:${userId}`;
}

function deliveredKey(userId: string) {
  return `${DELIVERED_KEY_PREFIX}:${userId}`;
}

function canNotify() {
  return Platform.OS !== "web" && Device.isDevice;
}

export async function getPutMeOnRequestNotificationsEnabled(userId: string) {
  const raw = await AsyncStorage.getItem(prefKey(userId));
  if (raw === null) {
    return true;
  }

  return raw === "true";
}

export async function setPutMeOnRequestNotificationsEnabled(userId: string, enabled: boolean) {
  await AsyncStorage.setItem(prefKey(userId), enabled ? "true" : "false");
}

async function readPending(userId: string): Promise<PendingPutMeOnNotification[]> {
  const raw = await AsyncStorage.getItem(pendingKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as PendingPutMeOnNotification[];
  } catch {
    return [];
  }
}

async function writePending(userId: string, items: PendingPutMeOnNotification[]) {
  await AsyncStorage.setItem(pendingKey(userId), JSON.stringify(items));
}

async function readDeliveredIds(userId: string) {
  const raw = await AsyncStorage.getItem(deliveredKey(userId));
  if (!raw) {
    return new Set<string>();
  }

  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

async function writeDeliveredIds(userId: string, ids: Set<string>) {
  await AsyncStorage.setItem(deliveredKey(userId), JSON.stringify([...ids]));
}

export async function queuePutMeOnRequestNotifications(
  recipientIds: string[],
  payload: {
    requestId: string;
    fromUserId: string;
    fromUsername: string;
    prompt: string;
  }
) {
  const uniqueRecipients = [...new Set(recipientIds.filter((id) => id !== payload.fromUserId))];
  const createdAt = new Date().toISOString();

  await Promise.all(
    uniqueRecipients.map(async (recipientId) => {
      const pending = await readPending(recipientId);
      const notification: PendingPutMeOnNotification = {
        id: `put-me-on-${payload.requestId}-${recipientId}`,
        requestId: payload.requestId,
        fromUserId: payload.fromUserId,
        fromUsername: payload.fromUsername,
        prompt: payload.prompt,
        created_at: createdAt
      };

      const withoutDuplicate = pending.filter((item) => item.id !== notification.id);
      await writePending(recipientId, [notification, ...withoutDuplicate]);
    })
  );
}

export async function deliverPendingPutMeOnNotifications(userId: string) {
  if (!canNotify()) {
    return;
  }

  const enabled = await getPutMeOnRequestNotificationsEnabled(userId);
  if (!enabled) {
    return;
  }

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return;
  }

  const pending = await readPending(userId);
  if (pending.length === 0) {
    return;
  }

  const delivered = await readDeliveredIds(userId);
  const toDeliver = pending.filter((item) => !delivered.has(item.id));

  for (const item of toDeliver) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: PUT_ME_ON_REQUEST_TITLE,
        body: putMeOnRequestNotificationBody(item.requestId, item.fromUsername, item.prompt),
        data: {
          type: "put_me_on_request",
          requestId: item.requestId,
          fromUserId: item.fromUserId
        }
      },
      trigger: null
    });

    delivered.add(item.id);
  }

  await writeDeliveredIds(userId, delivered);
  await writePending(userId, []);
}

export async function clearPutMeOnNotificationStateForSignOut(userId: string) {
  await Promise.all([
    AsyncStorage.removeItem(prefKey(userId)),
    AsyncStorage.removeItem(pendingKey(userId)),
    AsyncStorage.removeItem(deliveredKey(userId))
  ]);
}
