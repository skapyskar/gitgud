"use client";

import { useEffect, useState } from "react";
import { Panel } from "../../components/ui";
import { fetchAchievements, FamAchievementRow } from "../famApi";

export default function FamAchievementsPanel({ famId }: { famId: string }) {
  const [achievements, setAchievements] = useState<FamAchievementRow[]>([]);

  useEffect(() => {
    fetchAchievements(famId).then((res) => setAchievements(res?.achievements ?? []));
  }, [famId]);

  return (
    <Panel title="Achievements" accent="habit">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {achievements.map((a) => (
          <div
            key={a.key}
            title={a.label}
            className={`r-lg p-3 text-center border ${
              a.unlocked ? "border-acc/60 bg-acc/10" : "chip border-line opacity-50"
            }`}
          >
            <div className="text-lg mb-1">{a.unlocked ? "🏆" : "🔒"}</div>
            <div className="text-[10.5px] font-semibold text-ink2 leading-tight">{a.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
