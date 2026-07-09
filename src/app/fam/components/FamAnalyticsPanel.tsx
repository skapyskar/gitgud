"use client";

import { useEffect, useState } from "react";
import { Panel } from "../../components/ui";
import { smoothPath } from "../../dashboard/components/momentum";
import { fetchAnalytics, FamAnalytics } from "../famApi";

function MomentumChart({ values, label }: { values: number[]; label: string }) {
  const { line, area } = smoothPath(values, 400, 90, 6, 14);
  return (
    <div>
      <div className="text-[10.5px] tracking-widest text-ink3 font-bold mb-1.5">{label}</div>
      <svg viewBox="0 0 400 90" className="w-full h-[70px]">
        <defs>
          <linearGradient id={`fam-analytics-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--acc)", stopOpacity: 0.32 }} />
            <stop offset="1" style={{ stopColor: "var(--acc)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#fam-analytics-${label})`} />
        <path d={line} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const CATEGORY_COLOR: Record<string, string> = {
  DEV: "var(--acc)",
  ACADEMICS: "var(--acc3)",
  HEALTH: "var(--gold)",
  LIFE: "var(--rose)",
};

export default function FamAnalyticsPanel({ famId }: { famId: string }) {
  const [data, setData] = useState<FamAnalytics | null>(null);

  useEffect(() => {
    fetchAnalytics(famId).then((res) => {
      if (res) setData(res);
    });
  }, [famId]);

  if (!data) return null;

  const contribTotal = data.memberContribution.reduce((s, m) => s + m.total, 0) || 1;
  const habitTotal = data.habitDistribution.reduce((s, h) => s + h.count, 0) || 1;

  return (
    <Panel title="Analytics" accent="cyan">
      <div className="grid gap-5 sm:grid-cols-2">
        <MomentumChart values={data.weeklyMomentum} label="WEEKLY MOMENTUM" />
        <MomentumChart values={data.monthlyMomentum} label="MONTHLY MOMENTUM" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 mt-5">
        <div>
          <div className="text-[10.5px] tracking-widest text-ink3 font-bold mb-2">MEMBER CONTRIBUTION · 30D</div>
          <div className="flex flex-col gap-1.5">
            {data.memberContribution.map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <span className="text-[12px] text-ink2 w-20 truncate shrink-0">{m.label}</span>
                <div className="flex-1 chip r-md h-2.5 overflow-hidden">
                  <div
                    className="grad-primary h-full"
                    style={{ width: `${(m.total / contribTotal) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-ink shrink-0 w-10 text-right">{m.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] tracking-widest text-ink3 font-bold mb-2">HABIT DISTRIBUTION</div>
          <div className="flex flex-col gap-1.5">
            {data.habitDistribution.map((h) => (
              <div key={h.category} className="flex items-center gap-2">
                <span className="text-[12px] text-ink2 w-20 truncate shrink-0">{h.category}</span>
                <div className="flex-1 chip r-md h-2.5 overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${(h.count / habitTotal) * 100}%`, background: CATEGORY_COLOR[h.category] ?? "var(--acc)" }}
                  />
                </div>
                <span className="text-[11px] font-bold text-ink shrink-0 w-10 text-right">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
