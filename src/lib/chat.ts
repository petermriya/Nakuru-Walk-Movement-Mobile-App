/* The rules behind chats and removing members. No database here, so the tests can check them. */

export const MESSAGE_MAX = 1000;
/** A gentle cap, so one person (or a stuck phone) can't flood someone's phone. */
export const MESSAGES_PER_DAY = 300;
export const REASON_MAX = 200;

/** Each pair of members has one chat. The smaller id always goes first, so A–B and B–A are the same chat. */
export function pair(x: string, y: string): { userA: string; userB: string } {
  return x < y ? { userA: x, userB: y } : { userA: y, userB: x };
}

/** Which side of the chat this person is on, or null if it isn't their chat. */
export function sideOf(chat: { userA: string; userB: string }, userId: string): "a" | "b" | null {
  if (chat.userA === userId) return "a";
  if (chat.userB === userId) return "b";
  return null;
}

export const otherOf = (chat: { userA: string; userB: string }, userId: string) => (chat.userA === userId ? chat.userB : chat.userA);

/** A message needs words. Line breaks are kept, but not runs of empty lines. */
export function parseMessage(body: unknown) {
  const b = String(body ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MESSAGE_MAX);
  if (!b) return { error: "Write a message first." } as const;
  return { value: b } as const;
}

/** The admin's note on why someone was removed. Optional. */
export function parseReason(reason: unknown) {
  return String(reason ?? "").replace(/\s+/g, " ").trim().slice(0, REASON_MAX) || null;
}

const excerpt = (s: string, max = 110) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

/** What the other person's phone shows. One tag per chat: the latest message replaces the last and buzzes again. */
export function messageNote(m: { chatId: string; authorName: string; body: string }) {
  return {
    title: m.authorName.trim() || "A member",
    body: excerpt(m.body),
    url: `/chats/${m.chatId}`,
    tag: `chat-${m.chatId}`,
    renotify: true,
  };
}
