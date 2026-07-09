"use client";

import { useEffect, useState } from "react";
import { Panel } from "../../components/ui";
import { fetchActivity, FamActivityRow } from "../famApi";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FamActivityFeed({ famId }: { famId: string }) {
  const [activities, setActivities] = useState<FamActivityRow[]>([]);

  useEffect(() => {
    fetchActivity(famId).then((res) => setActivities(res?.activities ?? []));
  }, [famId]);

  return (
    <Panel title="Activity" accent="cyan">
      {activities.length === 0 ? (
        <p className="text-sm text-ink3">Nothing yet — activity will show up here.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {activities.map((a) => (
            <div key={a.id} className="flex items-baseline gap-2 text-[13px]">
              <span className="flex-1 min-w-0 text-ink2 truncate">{a.message}</span>
              <span className="text-[11px] text-ink3 shrink-0">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
