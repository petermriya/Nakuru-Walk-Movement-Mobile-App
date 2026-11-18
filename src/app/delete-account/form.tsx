"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions";

export function DeleteForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  const [typed, setTyped] = useState("");
  return (
    <form action={action} className="panel mt-3 space-y-4 p-5">
      <p className="text-[16px]">You’re signed in as <strong className="font-semibold">{email}</strong>.</p>
      <div>
        <label htmlFor="d-confirm" className="label">Type <strong>delete</strong> to confirm</label>
        <input id="d-confirm" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="off" autoCorrect="off" className="field" />
      </div>
      {state?.error && <p className="text-[15px] text-negative" role="alert">{state.error}</p>}
      <button className="btn btn-danger w-full" disabled={pending || typed.trim().toLowerCase() !== "delete"}>{pending ? "Deleting…" : "Delete my account"}</button>
    </form>
  );
}
