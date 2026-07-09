import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { computeFamRankingScore, famLifetimeXP } from "@/lib/fam";

/**
 * Weighted growth rankings — rewards consistent long-term improvement, not
 * raw points, so a brand-new Fam can't buy rank #1 with one huge day.
 * "global" = last 7 days, "monthly" = last 30 days, both via the same
 * weighted formula (avg momentum, consistency, participation, stability).
 * "all-time" is intentionally simple: lifetime accumulated member XP (live
 * sum, not the unused Fam.xp counter — see famLifetimeXP) — a different,
 * complementary view rather than another weighted window.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireUser();
    if (error) return error;

    const scope = request.nextUrl.searchParams.get("scope") ?? "global";
    if (!["global", "monthly", "all-time"].includes(scope)) {
      return NextResponse.json({ error: "scope must be global, monthly, or all-time" }, { status: 400 });
    }

    const fams = await prisma.fam.findMany({ select: { id: true, name: true, icon: true } });

    if (scope === "all-time") {
      const rankings = await Promise.all(
        fams.map(async (f) => ({
          famId: f.id,
          name: f.name,
          icon: f.icon,
          score: await famLifetimeXP(f.id),
          avgMomentum: 0,
          consistencyPct: 0,
          participationPct: 0,
          stabilityPct: 0,
        }))
      );
      rankings.sort((a, b) => b.score - a.score);
      return NextResponse.json({ success: true, rankings: rankings.slice(0, 100) });
    }

    const days = scope === "monthly" ? 30 : 7;
    const rankings = await Promise.all(
      fams.map(async (f) => {
        const s = await computeFamRankingScore(f.id, days);
        return { famId: f.id, name: f.name, icon: f.icon, ...s };
      })
    );
    rankings.sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, rankings: rankings.slice(0, 100) });
  } catch (err) {
    console.error("Rankings error:", err);
    return NextResponse.json({ error: "Failed to load rankings" }, { status: 500 });
  }
}
