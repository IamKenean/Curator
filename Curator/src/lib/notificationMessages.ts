export const RECEIVED_NOTIFICATION_TITLE = "Recommendation Received";
export const REMINDER_NOTIFICATION_TITLE = "Recommendation Reminder";

export const RECEIVED_TEMPLATES = [
  "{name} put you on.",
  "{name} isn't gatekeeping.",
  "{name} thinks you need to see this.",
  "{name} said you're not ready.",
  "{name} has a rec and it's personal.",
  "You've been put on.",
  "{name} dropped something for you."
] as const;

export const REMINDER_TEMPLATES = [
  "You still haven't watched {title}.",
  "{title} is waiting on you.",
  "{name} put you on weeks ago. Still sitting there.",
  "Don't let {title} collect dust.",
  "{name} trusted you with this. Watch it."
] as const;

type MessageVars = {
  name?: string;
  title?: string;
};

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickTemplate<T extends readonly string[]>(templates: T, seed: string) {
  return templates[hashString(seed) % templates.length];
}

function applyTemplate(template: string, vars: MessageVars) {
  const name = vars.name ? `@${vars.name}` : "Someone";
  const title = vars.title ?? "that pick";

  return template.replaceAll("{name}", name).replaceAll("{title}", title);
}

export function receivedNotificationBody(recommendationId: string, senderUsername?: string | null) {
  const template = pickTemplate(RECEIVED_TEMPLATES, recommendationId);
  return applyTemplate(template, { name: senderUsername ?? undefined });
}

export function reminderNotificationBody(recommendationId: string, senderUsername?: string | null, title?: string | null) {
  const template = pickTemplate(REMINDER_TEMPLATES, `${recommendationId}:reminder`);
  return applyTemplate(template, {
    name: senderUsername ?? undefined,
    title: title ?? undefined
  });
}

export const PUT_ME_ON_REQUEST_TITLE = "Put Me On request";

export const PUT_ME_ON_REQUEST_TEMPLATES = [
  "{name} is looking for a rec.",
  "{name} wants to be put on.",
  "{name} asked: \"{prompt}\"",
  "Your friend {name} needs a pick.",
  "{name} opened a Put Me On request."
] as const;

export function putMeOnRequestNotificationBody(requestId: string, senderUsername?: string | null, prompt?: string | null) {
  const template = pickTemplate(PUT_ME_ON_REQUEST_TEMPLATES, requestId);
  const name = senderUsername ? `@${senderUsername}` : "A friend";
  const trimmedPrompt = prompt?.trim();
  const preview =
    trimmedPrompt && trimmedPrompt.length > 48 ? `${trimmedPrompt.slice(0, 45)}...` : trimmedPrompt ?? "something new";

  return template.replaceAll("{name}", name).replaceAll("{prompt}", preview);
}
