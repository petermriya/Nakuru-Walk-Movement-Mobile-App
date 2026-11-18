import { kmText } from "./record";
import { formatTime, type Reminder } from "./time";

type W = { id: string; title: string; distanceKm: number; meetingPoint: string; startsAt: Date; dressCode: string | null };

/** What each reminder says. The evening one goes to every member; the one two hours before goes to people coming. */
export function reminderNote(kind: Reminder, w: W) {
  const time = formatTime(w.startsAt);
  if (kind === "eve")
    return {
      title: `Tomorrow: ${w.title}`,
      body: `${kmText(w.distanceKm)}. Meet at ${w.meetingPoint}, ${time}.${w.dressCode ? ` Wear: ${w.dressCode}.` : ""} Tap to say you’re coming.`,
      url: `/w/${w.id}`,
      tag: `walk-${w.id}`,
    };
  return {
    title: `We leave at ${time}: ${w.title}`,
    body: `Meet at ${w.meetingPoint}. Bring water. See you there!`,
    url: `/w/${w.id}`,
    tag: `walk-${w.id}`,
    renotify: true,
  };
}
