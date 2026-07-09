import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Fam now lives inline as the dashboard's 3rd scroll-snap page rather than a
// standalone route. This URL is kept only so bookmarks and invite deep-links
// still work — it just forwards into the dashboard and scrolls to that page.
export default async function FamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { username: true },
  });
  if (!user) {
    redirect("/login");
  }
  if (!user.username) {
    redirect("/complete-profile");
  }

  redirect("/dashboard?scrollTo=fam");
}
