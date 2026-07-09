"use client";

import { useEffect, useState } from "react";
import { Panel, HudButton, inputCls, labelCls } from "../../components/ui";
import {
  fetchChallenges,
  proposeChallenge,
  respondToChallenge,
  contributeToChallenge,
  FamChallenge,
  FamMemberDetail,
} from "../famApi";

export default function ChallengesPanel({
  famId,
  currentUserId,
  members,
}: {
  famId: string;
  currentUserId: string;
  members: FamMemberDetail[];
}) {
  const [challenges, setChallenges] = useState<FamChallenge[]>([]);
  const [proposing, setProposing] = useState(false);
  const [opponentId, setOpponentId] = useState("");
  const [metric, setMetric] = useState("");
  const [target, setTarget] = useState("");

  const load = () => {
    fetchChallenges(famId).then((res) => setChallenges(res?.challenges ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [famId]);

  const onPropose = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(target);
    if (!opponentId || !metric.trim() || !Number.isFinite(t) || t <= 0) return;
    await proposeChallenge(famId, { opponentId, metric: metric.trim(), target: t });
    setMetric("");
    setTarget("");
    setOpponentId("");
    setProposing(false);
    load();
  };

  const onRespond = async (id: string, action: "accept" | "decline") => {
    await respondToChallenge(id, action);
    load();
  };

  const onContribute = async (id: string) => {
    await contributeToChallenge(id, 1);
    load();
  };

  const nameFor = (userId: string, fallback: { username: string | null; name: string | null }) =>
    fallback.username ? `@${fallback.username}` : fallback.name || "Member";

  const pending = challenges.filter((c) => c.status === "PENDING");
  const active = challenges.filter((c) => c.status === "ACTIVE");
  const resolved = challenges.filter((c) => c.status === "COMPLETED" || c.status === "DECLINED");

  const otherMembers = members.filter((m) => m.userId !== currentUserId);

  return (
    <Panel
      title="Challenges"
      accent="habit"
      right={
        <HudButton variant="ghost" onClick={() => setProposing((v) => !v)}>
          {proposing ? "Cancel" : "Challenge"}
        </HudButton>
      }
    >
      {proposing && (
        <form onSubmit={onPropose} className="flex flex-col gap-2 mb-4">
          <div>
            <label className={labelCls}>Opponent</label>
            <select className={inputCls} value={opponentId} onChange={(e) => setOpponentId(e.target.value)} required>
              <option value="">Select a member</option>
              {otherMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.username ? `@${m.username}` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Metric (e.g. &quot;workouts&quot;)</label>
            <input className={inputCls} value={metric} onChange={(e) => setMetric(e.target.value)} maxLength={60} required />
          </div>
          <div>
            <label className={labelCls}>First to</label>
            <input className={inputCls} type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} required />
          </div>
          <HudButton type="submit" variant="primary" className="py-2">
            Send challenge
          </HudButton>
        </form>
      )}

      {pending.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">PENDING</div>
          <div className="flex flex-col gap-2">
            {pending.map((c) => (
              <div key={c.id} className="chip r-lg flex items-center gap-2 px-3.5 py-2.5">
                <span className="flex-1 text-sm truncate">
                  {nameFor(c.challengerId, c.challenger)} vs {nameFor(c.opponentId, c.opponent)} — first to {c.target} {c.metric}
                </span>
                {c.opponentId === currentUserId && (
                  <>
                    <HudButton variant="primary" onClick={() => onRespond(c.id, "accept")}>
                      Accept
                    </HudButton>
                    <HudButton variant="ghost" onClick={() => onRespond(c.id, "decline")}>
                      Decline
                    </HudButton>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">ACTIVE</div>
          <div className="flex flex-col gap-2">
            {active.map((c) => (
              <div key={c.id} className="chip r-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex-1 text-sm truncate">{c.metric}</span>
                  {(c.challengerId === currentUserId || c.opponentId === currentUserId) && (
                    <HudButton variant="primary" onClick={() => onContribute(c.id)}>
                      +1
                    </HudButton>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink3">
                  <span className="flex-1 truncate">{nameFor(c.challengerId, c.challenger)}</span>
                  <span>{c.challengerProgress}/{c.target}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink3">
                  <span className="flex-1 truncate">{nameFor(c.opponentId, c.opponent)}</span>
                  <span>{c.opponentProgress}/{c.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">RESOLVED</div>
          <div className="flex flex-col gap-1">
            {resolved.map((c) => (
              <div key={c.id} className="text-xs text-ink3 truncate">
                {c.status === "COMPLETED" && c.winnerId
                  ? `🏆 ${nameFor(c.winnerId, c.winnerId === c.challengerId ? c.challenger : c.opponent)} won "${c.metric}"`
                  : `${c.metric} — declined`}
              </div>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 && !proposing && <p className="text-sm text-ink3">No challenges yet.</p>}
    </Panel>
  );
}
