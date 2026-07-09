"use client";

import { useEffect, useState } from "react";
import { Panel, HudButton, inputCls, labelCls } from "../../components/ui";
import { fetchGoals, proposeGoal, voteOnGoal, contributeToGoal, FamGoal } from "../famApi";

export default function FamGoalsPanel({ famId, currentUserId }: { famId: string; currentUserId: string }) {
  const [goals, setGoals] = useState<FamGoal[]>([]);
  const [proposing, setProposing] = useState(false);
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");

  const load = () => {
    fetchGoals(famId).then((res) => setGoals(res?.goals ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [famId]);

  const onPropose = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(targetValue);
    if (!description.trim() || !Number.isFinite(target) || target <= 0) return;
    await proposeGoal(famId, { description: description.trim(), targetValue: target });
    setDescription("");
    setTargetValue("");
    setProposing(false);
    load();
  };

  const onVote = async (goalId: string, approve: boolean) => {
    await voteOnGoal(goalId, approve);
    load();
  };

  const onContribute = async (goalId: string) => {
    await contributeToGoal(goalId, 1);
    load();
  };

  const proposed = goals.filter((g) => g.status === "PROPOSED");
  const active = goals.filter((g) => g.status === "ACTIVE");
  const completed = goals.filter((g) => g.status === "COMPLETED");

  return (
    <Panel
      title="Fam Goals"
      accent="gold"
      right={
        <HudButton variant="ghost" onClick={() => setProposing((v) => !v)}>
          {proposing ? "Cancel" : "Propose"}
        </HudButton>
      }
    >
      {proposing && (
        <form onSubmit={onPropose} className="flex flex-col gap-2 mb-4">
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} required />
          </div>
          <div>
            <label className={labelCls}>Target (numeric)</label>
            <input className={inputCls} type="number" min={1} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
          </div>
          <HudButton type="submit" variant="primary" className="py-2">
            Submit for vote
          </HudButton>
        </form>
      )}

      {active.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">ACTIVE</div>
          <div className="flex flex-col gap-2">
            {active.map((g) => (
              <div key={g.id} className="chip r-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex-1 text-sm font-semibold truncate">{g.description}</span>
                  <HudButton variant="primary" onClick={() => onContribute(g.id)}>
                    +1
                  </HudButton>
                </div>
                <div className="chip r-md h-2 overflow-hidden">
                  <div
                    className="grad-primary h-full transition-all"
                    style={{ width: `${Math.min(100, (g.currentValue / g.targetValue) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-ink3 mt-1">
                  {g.currentValue} / {g.targetValue}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {proposed.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">VOTING</div>
          <div className="flex flex-col gap-2">
            {proposed.map((g) => {
              const myVote = g.votes.find((v) => v.userId === currentUserId);
              return (
                <div key={g.id} className="chip r-lg flex items-center gap-2 px-3.5 py-2.5">
                  <span className="flex-1 text-sm font-semibold truncate">{g.description}</span>
                  <span className="text-[11px] text-ink3 shrink-0">
                    {g.votes.filter((v) => v.approve).length} yes
                  </span>
                  <HudButton
                    variant={myVote?.approve ? "primary" : "ghost"}
                    onClick={() => onVote(g.id, true)}
                  >
                    Approve
                  </HudButton>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div className="text-[11px] tracking-widest text-ink3 font-bold mb-2">COMPLETED</div>
          <div className="flex flex-col gap-1">
            {completed.map((g) => (
              <div key={g.id} className="text-xs text-ink3 truncate">
                ✓ {g.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && !proposing && <p className="text-sm text-ink3">No goals yet — propose one.</p>}
    </Panel>
  );
}
