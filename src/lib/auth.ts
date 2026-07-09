// src/lib/auth.ts
import GitHub from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth-session";

export const authOptions: NextAuthOptions = {
  // The generated client lives outside @prisma/client, so the adapter needs a cast.
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),

  // Pin the session cookie name/options to a single source of truth (shared with
  // the manual credentials-login/signup routes) so read and write never disagree,
  // regardless of NEXTAUTH_URL. Without this, a misconfigured NEXTAUTH_URL on the
  // host makes getServerSession look for a differently-named cookie than the one
  // login set, silently bouncing the user back to /login.
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: SESSION_COOKIE_OPTIONS,
    },
  },

  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Registered for NextAuth's type/provider plumbing only. Actual username/password
    // login does NOT go through this provider's authorize()/signIn flow — NextAuth v4
    // always issues a JWT for Credentials logins regardless of `session.strategy`, which
    // would conflict with the database-session strategy used everywhere else in this app.
    // The real login path is POST /api/auth/credentials-login, which manually creates a
    // Session row (mirroring what PrismaAdapter does for OAuth) and sets the session
    // cookie directly. See that route for details.
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        return null;
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to dashboard
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};