"use client";

import { useOptimistic, useTransition } from "react";
import { markPresent } from "@/app/actions";
import { Avatar, Icon } from "@/components/ui";

export function RollRow({ walkId, person }: { walkId: string; person: { id: string; name: string; image: string | null; there: boolean; coming: boolean } }) {
  const [there, setThere] = useOptimistic(person.there);
  const [, start] = useTransition();
  return (
    <li>
      <button
        type="button"
        aria-pressed={there}
        className="press flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() =>
          start(async () => {
            setThere(!there);
            await markPresent(walkId, person.id, !there);
          })
        }
      >
        <Avatar id={person.id} name={person.name} image={person.image} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">{person.name}</span>
          {person.coming && !there && <span className="text-[13px] text-muted">Said they’re coming</span>}
        </span>
        <span className={`flex size-9 items-center justify-center rounded-full border-2 ${there ? "border-accent bg-accent text-white" : "border-control text-transparent"}`}>
          <Icon.check className="size-5" />
        </span>
      </button>
    </li>
  );
}
