"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { sendMessage, setBlocked, type SentMessage } from "@/app/actions";
import { IconButton } from "@/components/icon-button";
import { Avatar, Icon } from "@/components/ui";
import { MESSAGE_MAX } from "@/lib/chat";
import { formatTime, relativeDay } from "@/lib/time";

type Msg = SentMessage & { pending?: boolean };
type Person = { id: string; name: string; image: string | null };

const POLL_MS = 4000;

/** One private conversation: the messages, a box to write in, and Block. New messages arrive every few seconds while it's open. */
export function ChatThread({ chatId, meId, other, iBlocked, blockedMe, initial, theirSeen: seen0 }: { chatId: string; meId: string; other: Person; iBlocked: boolean; blockedMe: boolean; initial: Msg[]; theirSeen: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [theirSeen, setTheirSeen] = useState(seen0);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [blocking, startBlock] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const router = useRouter();
  const name = other.name.trim() || "A member";
  const first = name.split(/\s+/)[0];
  const blocked = iBlocked || blockedMe;

  // Keep the newest message in view, unless they've scrolled up to read.
  useLayoutEffect(() => {
    if (stick.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [msgs.length]);
  useEffect(() => {
    const onScroll = () => {
      stick.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const last = msgs.filter((m) => !m.pending).at(-1)?.createdAt;
  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const r = await fetch(`/api/chats/${chatId}?after=${encodeURIComponent(last ?? new Date(0).toISOString())}`, { cache: "no-store" });
      if (!r.ok) return;
      const d: { messages: Msg[]; theirSeen: string | null } = await r.json();
      setTheirSeen(d.theirSeen);
      if (d.messages.length)
        setMsgs((cur) => {
          const have = new Set(cur.map((m) => m.id));
          return [...cur, ...d.messages.filter((m) => !have.has(m.id))];
        });
    } catch {}
  }, [chatId, last]);
  useEffect(() => {
    const every = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(every);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [poll]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setError("");
    const temp: Msg = { id: `temp-${Date.now()}`, userId: meId, body: text, createdAt: new Date().toISOString(), pending: true };
    stick.current = true;
    setMsgs((cur) => [...cur, temp]);
    setBody("");
    const r = await sendMessage(chatId, text);
    if (r.error || !r.message) {
      setMsgs((cur) => cur.filter((m) => m.id !== temp.id));
      setBody(text);
      setError(r.error ?? "That didn’t send. Try again.");
      return;
    }
    const sent = r.message;
    setMsgs((cur) => (cur.some((m) => m.id === sent.id) ? cur.filter((m) => m.id !== temp.id) : cur.map((m) => (m.id === temp.id ? sent : m))));
  };

  const toggleBlock = () => {
    setMenu(false);
    if (!confirm(iBlocked ? `Unblock ${first}? You’ll be able to message each other again.` : `Block ${first}? Neither of you will be able to send messages. ${first} won’t be told.`)) return;
    startBlock(async () => {
      const r = await setBlocked(other.id, !iBlocked);
      if (r?.error) setError(r.error);
      router.refresh();
    });
  };

  // The last message of mine that they've seen gets a quiet "Seen" under it.
  const seenId = theirSeen ? msgs.filter((m) => m.userId === meId && !m.pending && m.createdAt <= theirSeen).at(-1)?.id : undefined;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px]">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-ground/90 px-2 pt-[max(env(safe-area-inset-top),8px)] pb-2 backdrop-blur-xl">
        <IconButton href="/chats" label="All messages">
          <Icon.back className="size-6" />
        </IconButton>
        <Link href={`/people/${other.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar id={other.id} name={name} image={other.image} size={38} />
          <span className="truncate text-[17px] font-bold">{name}</span>
        </Link>
        <div className="relative">
          <IconButton label="Chat options" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            <Icon.more className="size-6" />
          </IconButton>
          {menu && (
            <div className="panel absolute top-12 right-0 z-30 w-56 overflow-hidden p-1 shadow-lift">
              <Link href={`/people/${other.id}`} className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold hover:bg-surface-2">
                <Icon.user className="size-5 text-muted" /> See {first}’s profile
              </Link>
              <button type="button" disabled={blocking} onClick={toggleBlock} className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-negative hover:bg-surface-2">
                <Icon.block className="size-5" /> {iBlocked ? `Unblock ${first}` : `Block ${first}`}
              </button>
            </div>
          )}
        </div>
      </header>

      <div ref={list} className="px-4 pt-2 pb-36" aria-live="polite">
        {msgs.length === 0 && (
          <div className="mx-auto mt-10 max-w-[320px] text-center">
            <Avatar id={other.id} name={name} image={other.image} size={72} />
            <p className="mt-3 text-[17px] font-semibold">Say hello to {first}</p>
            <p className="mt-1 text-[14px] text-muted">Only the two of you can read this chat.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.userId === meId;
          const at = new Date(m.createdAt);
          const prev = msgs[i - 1];
          const newDay = !prev || relativeDay(new Date(prev.createdAt), at) !== "Today";
          const grouped = prev && prev.userId === m.userId && !newDay && at.getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center text-[12px] font-semibold text-faint">{relativeDay(at, new Date())}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-3"}`}>
                <div className={`max-w-[80%] rounded-[20px] px-3.5 py-2 ${mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-surface shadow-card ring-1 ring-ink/[0.05]"} ${m.pending ? "opacity-60" : ""}`}>
                  <p className="text-[16px] leading-snug whitespace-pre-line [overflow-wrap:anywhere]">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[11px] ${mine ? "text-white/75" : "text-faint"}`}>{m.pending ? "Sending…" : formatTime(at)}</p>
                </div>
              </div>
              {m.id === seenId && <p className="mt-1 pr-1 text-right text-[11px] font-semibold text-faint">Seen</p>}
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-[536px]">
          {error && <p role="alert" className="mb-2 rounded-2xl bg-surface px-4 py-2 text-[14px] font-semibold text-negative shadow-card">{error}</p>}
          {blocked ? (
            <div className="rounded-[26px] bg-surface/92 px-5 py-4 text-center text-[15px] text-muted shadow-lift ring-1 ring-ink/[0.06] backdrop-blur-xl">
              {iBlocked ? (
                <>
                  You blocked {first}.{" "}
                  <button type="button" onClick={toggleBlock} className="font-semibold text-accent">Unblock</button>
                </>
              ) : (
                "You can’t message this person."
              )}
            </div>
          ) : (
            <form
              className="flex items-end gap-2 rounded-[28px] bg-surface/92 p-2 shadow-lift ring-1 ring-ink/[0.06] backdrop-blur-xl"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor="message" className="sr-only">Message {first}</label>
              <textarea
                id="message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  // On a computer, Enter sends and Shift+Enter starts a new line. On a phone, the Send button sends.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                    e.preventDefault();
                    send();
                  }
                }}
                maxLength={MESSAGE_MAX}
                rows={Math.min(5, Math.max(1, body.split("\n").length, Math.ceil(body.length / 34)))}
                placeholder={`Message ${first}`}
                className="block max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] leading-snug placeholder:text-faint focus:outline-none"
              />
              <button type="submit" disabled={!body.trim()} aria-label="Send" className="btn size-11 shrink-0 p-0">
                <Icon.send className="size-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
