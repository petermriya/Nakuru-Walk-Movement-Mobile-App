import { after } from "next/server";
import { ChatThread } from "@/components/chat-thread";
import { requireMember } from "@/lib/club";
import { chatData, setChatSeen } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const { me, club } = await requireMember();
  const { other } = await chatData(id, club.id, me.id);
  return { title: other.name.trim() || "Chat" };
}

/** A private chat with one other member. Opening it marks it read. */
export default async function Chat({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const { me, club } = await requireMember();
  const d = await chatData(id, club.id, me.id);
  after(() => setChatSeen(d.chat.id, me.id));
  return (
    <ChatThread
      chatId={d.chat.id}
      meId={me.id}
      other={d.other}
      iBlocked={d.iBlocked}
      blockedMe={d.blockedMe}
      initial={d.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      theirSeen={d.theirSeen?.toISOString() ?? null}
    />
  );
}
