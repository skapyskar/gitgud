import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AuthGate from "../components/AuthGate";
import { getAuthErrorMessage } from "@/lib/auth-error.mjs";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = getAuthErrorMessage(Array.isArray(error) ? error[0] : error);

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="aurora" />
      <div className="noise" />
      <AuthGate errorMessage={errorMessage} />
    </main>
  );
}
