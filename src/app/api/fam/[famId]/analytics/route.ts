import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getMembership, famDailyTotals, famMemberContribution, famHabitDistribution } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const membership = await getMembership(user.id, famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    const [weekly, monthly, memberContribution, habitDistribution] = await Promise.all([
      famDailyTotals(famId, 7),
      famDailyTotals(famId, 30),
      famMemberContribution(famId, 30),
      famHabitDistribution(famId),
    ]);

    return NextResponse.json({
      success: true,
      weeklyMomentum: weekly.dailyTotals,
      monthlyMomentum: monthly.dailyTotals,
      memberContribution,
      habitDistribution,
    });
  } catch (err) {
    console.error("Fam analytics error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
