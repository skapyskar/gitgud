import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AuthGate from "../components/AuthGate";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="aurora" />
      <div className="noise" />
      <AuthGate />
    </main>
  );
}
