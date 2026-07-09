import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import FamPageClient from "./components/FamPageClient";

export const dynamic = "force-dynamic";

export default async function FamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, username: true },
  });
  if (!user) {
    redirect("/login");
  }
  if (!user.username) {
    redirect("/complete-profile");
  }

  return <FamPageClient currentUserId={user.id} />;
}
