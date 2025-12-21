"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { tierBaseXP } from "@/lib/gamification"; // ✅ ADD THIS IMPORT

export async function createTask(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Unauthorized - Please log in");
    }

    const title = formData.get("title") as string;
    const tier = (formData.get("tier") as any) || "C";
    const category = (formData.get("category") as any) || "DEV";
    const plannedDateStr = formData.get("plannedDate") as string;

    // Validate required fields
    if (!title || !plannedDateStr) {
      throw new Error("Title and planned date are required");
    }

    const plannedDate = new Date(plannedDateStr);

    // Validate date
    if (isNaN(plannedDate.getTime())) {
      throw new Error("Invalid date format");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // ✅ USE GAMIFICATION FUNCTION instead of inline map
    const basePoints = tierBaseXP(tier);

    await prisma.task.create({
      data: {
        title: title.trim(),
        tier,
        category,
        plannedDate,
        basePoints,
        userId: user.id,
      },
    });

    // Revalidate the dashboard to show new task
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error creating task:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}
