"use client";

/** Thin client for the /api/fam endpoints — mirrors dashboard/components/taskApi.ts's pattern. */

async function call<T>(url: string, method: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as T | { error: string } | null;
    if (!res.ok) {
      console.error(`${method} ${url} failed:`, (data as { error?: string })?.error);
      return null;
    }
    return data as T;
  } catch (err) {
    console.error(`${method} ${url} failed:`, err);
    return null;
  }
}

export interface FamSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp: number;
  level: number;
  _count?: { memberships: number };
}

export interface FamMembershipRow {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  fam: FamSummary;
}

export interface PendingInvite {
  id: string;
  status: string;
  expiresAt: string;
  fam: { id: string; name: string; icon: string | null };
}

export interface FamMemberDetail {
  userId: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  xp: number;
  streakDays: number;
  todayPoints: number;
  momentum14d: number[];
  levelProgress: { level: number; percent: number; currentLevelXP: number; neededLevelXP: number; remaining: number };
  majorHabits: string[];
}

export function createFam(payload: { name: string; description?: string; icon?: string }) {
  return call<{ success: boolean; fam: FamSummary; costPaid: number }>("/api/fam/create", "POST", payload);
}

export function inviteToFam(payload: { famId: string; username?: string }) {
  return call<{ success: boolean; invite: { id: string; code: string } }>("/api/fam/invite", "POST", payload);
}

export function respondToInvite(payload: { inviteId: string; action: "accept" | "decline" }) {
  return call<{ success: boolean }>("/api/fam/invite/respond", "POST", payload);
}

export function fetchMyFams() {
  return call<{ success: boolean; memberships: FamMembershipRow[]; pendingInvites: PendingInvite[] }>(
    "/api/fam/mine",
    "GET"
  );
}

export function fetchFamDetail(famId: string) {
  return call<{ success: boolean; fam: FamSummary; members: FamMemberDetail[] }>(`/api/fam/${famId}`, "GET");
}

export function browseFams() {
  return call<{ success: boolean; fams: FamSummary[] }>("/api/fam/browse", "GET");
}

export function searchUsername(username: string) {
  return call<{ success: boolean; user: { id: string; username: string; name: string | null } | null }>(
    `/api/fam/user-search?username=${encodeURIComponent(username)}`,
    "GET"
  );
}

export function kickMember(famId: string, userId: string) {
  return call<{ success: boolean }>(`/api/fam/${famId}/kick`, "POST", { userId });
}

export function leaveFam(famId: string) {
  return call<{ success: boolean }>(`/api/fam/${famId}/leave`, "POST", {});
}

export function transferOwnership(famId: string, newOwnerId: string) {
  return call<{ success: boolean }>(`/api/fam/${famId}/transfer-ownership`, "POST", { newOwnerId });
}

export function deleteFam(famId: string) {
  return call<{ success: boolean }>(`/api/fam/${famId}/delete`, "DELETE", {});
}

export interface FamGoal {
  id: string;
  description: string;
  targetValue: number;
  currentValue: number;
  status: "PROPOSED" | "ACTIVE" | "COMPLETED" | "REJECTED";
  proposedBy: { id: string; username: string | null; name: string | null };
  votes: Array<{ userId: string; approve: boolean }>;
}

export function fetchGoals(famId: string) {
  return call<{ success: boolean; goals: FamGoal[] }>(`/api/fam/${famId}/goals`, "GET");
}

export function proposeGoal(famId: string, payload: { description: string; targetValue: number }) {
  return call<{ success: boolean; goal: FamGoal }>(`/api/fam/${famId}/goals`, "POST", payload);
}

export function voteOnGoal(goalId: string, approve: boolean) {
  return call<{ success: boolean; activated: boolean }>(`/api/fam/goals/${goalId}/vote`, "POST", { approve });
}

export function contributeToGoal(goalId: string, amount: number) {
  return call<{ success: boolean; currentValue: number; completed: boolean }>(
    `/api/fam/goals/${goalId}/contribute`,
    "POST",
    { amount }
  );
}

export interface FamActivityRow {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  actor: { username: string | null; name: string | null } | null;
}

export function fetchActivity(famId: string) {
  return call<{ success: boolean; activities: FamActivityRow[] }>(`/api/fam/${famId}/activity`, "GET");
}

export interface FamAchievementRow {
  key: string;
  label: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export function fetchAchievements(famId: string) {
  return call<{ success: boolean; achievements: FamAchievementRow[] }>(`/api/fam/${famId}/achievements`, "GET");
}
