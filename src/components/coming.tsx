"use client";

import { useOptimistic, useTransition } from "react";
import { setComing } from "@/app/actions";
import { Icon } from "@/components/ui";
import { comingText } from "@/lib/record";

/** One tap: "I'm coming". Tap again to take it back. */
export function ComingButton({ walkId, mine, count, showCount = true }: { walkId: string; mine: boolean; count: number; showCount?: boolean }) {
  const [state, setState] = useOptimistic({ mine, count });
  const [, start] = useTransition();
  const flip = () =>
    start(async () => {
      const next = !state.mine;
      setState({ mine: next, count: state.count + (next ? 1 : -1) });
      try {
        navigator.vibrate?.(10);
      } catch {}
      await setComing(walkId, next);
    });
  return (
    <div>
      <button type="button" onClick={flip} aria-pressed={state.mine} className={`btn w-full ${state.mine ? "btn-done" : ""}`}>
        {state.mine ? (
          <>
            <Icon.check className="size-5" /> You’re coming
          </>
        ) : (
          "I’m coming"
        )}
      </button>
      {showCount && <p className="mt-2 text-center text-[14px] text-muted">{comingText(state.count, state.mine)}{state.mine ? " Tap again if plans change." : ""}</p>}
    </div>
  );
}
