"use client";

import { Modal, ModalTitle } from "../../components/ui";
import { smoothPath } from "../../dashboard/components/momentum";
import type { FamMemberDetail } from "../famApi";

function StatBlock({ member }: { member: FamMemberDetail }) {
  const { line, area } = smoothPath(member.momentum14d, 260, 100, 8, 16);
  return (
    <div className="glass r-xl p-4 flex-1 min-w-0">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="grad-primary font-display w-9 h-9 rounded-full grid place-items-center text-xs font-extrabold text-white shrink-0">
          {(member.name || member.username || "?").slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm truncate">{member.name || member.username}</div>
          {member.username && <div className="text-[11px] text-acc truncate">@{member.username}</div>}
        </div>
      </div>

      <div className="text-[11px] tracking-widest text-ink3 font-bold mb-1">MOMENTUM · 14D</div>
      <svg viewBox="0 0 260 100" className="w-full h-20 mb-3">
        <defs>
          <linearGradient id={`cmp-fill-${member.userId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--acc)", stopOpacity: 0.32 }} />
            <stop offset="1" style={{ stopColor: "var(--acc)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#cmp-fill-${member.userId})`} />
        <path d={line} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="grid grid-cols-2 gap-2 text-center mb-3">
        <div className="chip r-md py-2">
          <div className="text-[10px] text-ink3 tracking-wide">POINTS</div>
          <div className="font-display font-bold text-sm">{member.xp.toLocaleString()}</div>
        </div>
        <div className="chip r-md py-2">
          <div className="text-[10px] text-ink3 tracking-wide">STREAK</div>
          <div className="font-display font-bold text-sm">{member.streakDays}d</div>
        </div>
        <div className="chip r-md py-2">
          <div className="text-[10px] text-ink3 tracking-wide">TODAY</div>
          <div className="font-display font-bold text-sm">+{member.todayPoints}</div>
        </div>
        <div className="chip r-md py-2">
          <div className="text-[10px] text-ink3 tracking-wide">LEVEL</div>
          <div className="font-display font-bold text-sm">{member.levelProgress.level}</div>
        </div>
      </div>

      <div className="text-[11px] tracking-widest text-ink3 font-bold mb-1.5">OVERALL PROGRESS</div>
      <div className="chip r-md h-2.5 overflow-hidden mb-3">
        <div
          className="grad-primary h-full transition-all"
          style={{ width: `${Math.max(2, member.levelProgress.percent)}%` }}
        />
      </div>

      <div className="text-[11px] tracking-widest text-ink3 font-bold mb-1.5">MAJOR HABITS</div>
      {member.majorHabits.length === 0 ? (
        <div className="text-xs text-ink3">None yet</div>
      ) : (
        <ul className="text-xs text-ink2 space-y-1">
          {member.majorHabits.map((h, i) => (
            <li key={i} className="truncate">
              · {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CompareModal({
  a,
  b,
  onClose,
}: {
  a: FamMemberDetail;
  b: FamMemberDetail;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} wide>
      <ModalTitle>Compare</ModalTitle>
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <StatBlock member={a} />
        <StatBlock member={b} />
      </div>
    </Modal>
  );
}
