"use client";

import { useState } from "react";
import { Panel, HudButton, inputCls } from "../../components/ui";
import { searchUsername, inviteToFam } from "../famApi";

export default function SearchByUsernamePanel({ famId }: { famId: string | null }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ id: string; username: string; name: string | null } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setInvited(false);
    const res = await searchUsername(query);
    setResult(res?.user ?? null);
    setBusy(false);
  };

  const onInvite = async () => {
    if (!famId || !result) return;
    setBusy(true);
    const res = await inviteToFam({ famId, username: result.username });
    setBusy(false);
    if (res) setInvited(true);
  };

  return (
    <Panel title="Search by username" accent="gold">
      <form onSubmit={onSearch} className="flex gap-2 mb-3">
        <input
          className={inputCls}
          placeholder="username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <HudButton type="submit" variant="primary" disabled={busy || !query}>
          Search
        </HudButton>
      </form>
      {result === null && <p className="text-sm text-ink3">No user found.</p>}
      {result && (
        <div className="chip r-lg flex items-center gap-3 px-3.5 py-2.5">
          <span className="flex-1 text-sm font-semibold truncate">@{result.username}</span>
          {famId && (
            <HudButton variant="primary" onClick={onInvite} disabled={busy || invited}>
              {invited ? "Invited" : "Invite"}
            </HudButton>
          )}
        </div>
      )}
    </Panel>
  );
}
