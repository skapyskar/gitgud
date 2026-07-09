"use client";

import { useState } from "react";
import { Panel, HudButton, ConfirmModal } from "../../components/ui";
import { FamSummary, FamMemberDetail, kickMember, leaveFam, deleteFam } from "../famApi";
import CompareModal from "./CompareModal";
import SearchByUsernamePanel from "./SearchByUsernamePanel";
import FamGoalsPanel from "./FamGoalsPanel";
import FamActivityFeed from "./FamActivityFeed";
import FamAchievementsPanel from "./FamAchievementsPanel";

const ROLE_RANK = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;

export default function FamDetailView({
  fam,
  members,
  currentUserId,
  onChanged,
}: {
  fam: FamSummary;
  members: FamMemberDetail[];
  currentUserId: string;
  onChanged: () => void;
}) {
  const [compareTarget, setCompareTarget] = useState<FamMemberDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const me = members.find((m) => m.userId === currentUserId);
  const myRole = me?.role ?? "MEMBER";
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const onKick = async (userId: string) => {
    await kickMember(fam.id, userId);
    onChanged();
  };

  const onLeave = async () => {
    await leaveFam(fam.id);
    setConfirmLeave(false);
    onChanged();
  };

  const onDelete = async () => {
    await deleteFam(fam.id);
    setConfirmDelete(false);
    onChanged();
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={fam.name}
        subtitle={fam.description ?? undefined}
        right={
          <div className="flex gap-2">
            {myRole === "OWNER" ? (
              <HudButton variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete Fam
              </HudButton>
            ) : (
              <HudButton variant="ghost" onClick={() => setConfirmLeave(true)}>
                Leave
              </HudButton>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.userId} className="chip r-lg flex items-center gap-3 px-3.5 py-2.5">
              <span className="grad-primary font-display w-8 h-8 rounded-full grid place-items-center text-[11px] font-extrabold text-white shrink-0">
                {(m.name || m.username || "?").slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{m.name || m.username}</span>
                <span className="block text-[11px] text-ink3">
                  {m.role} · {m.xp.toLocaleString()} XP · {m.streakDays}d streak
                </span>
              </span>
              {m.userId !== currentUserId && (
                <HudButton variant="ghost" onClick={() => setCompareTarget(m)}>
                  Compare
                </HudButton>
              )}
              {canManage && m.userId !== currentUserId && ROLE_RANK[m.role] > ROLE_RANK[myRole] && (
                <HudButton variant="danger" onClick={() => onKick(m.userId)}>
                  Kick
                </HudButton>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <FamGoalsPanel famId={fam.id} currentUserId={currentUserId} />
        <FamActivityFeed famId={fam.id} />
      </div>

      <FamAchievementsPanel famId={fam.id} />

      {canManage && <SearchByUsernamePanel famId={fam.id} />}

      {compareTarget && me && (
        <CompareModal a={me} b={compareTarget} onClose={() => setCompareTarget(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this Fam?"
          body="This permanently removes the Fam and all memberships. This can't be undone."
          confirmLabel="Delete"
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {confirmLeave && (
        <ConfirmModal
          title="Leave this Fam?"
          body="You'll need a new invite to rejoin."
          confirmLabel="Leave"
          onConfirm={onLeave}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  );
}
