"use client";

import type { RewardEvent } from "../../components/RewardLayer";

/** Thin client for the /api/tasks endpoints — one place for fetch plumbing. */

export interface CompleteResponse extends RewardEvent {
  success: boolean;
  isFullyCompleted: boolean;
  newCompletedFrequency: number;
}

async function call<T>(url: string, method: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`${method} ${url} failed:`, err);
    return null;
  }
}

export function createTask(payload: Record<string, unknown>) {
  return call<{ success: boolean; task: { id: string } }>("/api/tasks/create", "POST", payload);
}

export function completeTask(payload: {
  taskId: string;
  durationMet?: boolean;
  count?: number;
}) {
  return call<CompleteResponse>("/api/tasks/complete", "POST", payload);
}

export function uncompleteTask(taskId: string, count = 1) {
  return call<{ success: boolean }>("/api/tasks/uncomplete", "POST", { taskId, count });
}

export function deleteTask(taskId: string) {
  return call<{ success: boolean }>("/api/tasks/delete", "DELETE", { taskId });
}

export function updateTask(payload: Record<string, unknown> & { taskId: string }) {
  return call<{ success: boolean }>("/api/tasks/update", "PATCH", payload);
}
