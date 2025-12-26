import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                dayLogs: {
                    orderBy: { date: 'desc' },
                    take: 30, // Last 30 days for efficiency graph
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            dayLogs: user.dayLogs
        });
    } catch (error) {
        console.error("Fetch daylogs error:", error);
        return NextResponse.json(
            { error: "Failed to fetch daylogs" },
            { status: 500 }
        );
    }
}
