"use client";

import { useState } from "react";
import { Task, TaskTier, Category } from "../../../../prisma/generated/client";

type WeeklyTask = Task & { repeatDays?: string | null };

interface DailyBoardProps {
  dailyTasks: Task[];
  weeklyTemplates: WeeklyTask[];
  userId: string;
}

const TIER_COLORS = {
  S: "border-red-600 bg-red-900/20 text-red-400",
  A: "border-orange-600 bg-orange-900/20 text-orange-400",
  B: "border-blue-600 bg-blue-900/20 text-blue-400",
  C: "border-gray-600 bg-gray-900/20 text-gray-400",
};

export default function DailyBoard({ dailyTasks, weeklyTemplates, userId }: DailyBoardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    tier: "C" as TaskTier,
    category: "LIFE" as Category,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const todayDayIndex = today.getDay();

  // Filter weekly templates that should appear today
  const todaysWeeklyTasks = weeklyTemplates.filter((template) => {
    const days = template.repeatDays?.split(",").map(Number) || [];
    return days.includes(todayDayIndex);
  });

  const handleCreateDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          type: "DAILY",
          tier: newTask.tier,
          category: newTask.category,
          scheduledDate: today.toISOString(),
        }),
      });

      if (res.ok) {
        setNewTask({ title: "", tier: "C", category: "LIFE" });
        setIsCreating(false);
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to create daily task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId: string, isWeeklyTask: boolean) => {
    try {
      await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          taskId,
          isWeeklyBonus: isWeeklyTask,
        }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  return (
    <div className="border border-green-900/30 p-4 bg-black/50 flex flex-col h-[calc(100vh-350px)] max-h-[665px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
          <h3 className="text-xl font-bold text-green-500 uppercase tracking-wider">
            &gt;&gt; Today&apos;s_Missions
          </h3>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-3 py-1 text-green-400 uppercase tracking-wider font-mono"
          >
            + Quick Task
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4 font-mono">
        {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
      </p>

      {/* Create Daily Task Form */}
      {isCreating && (
        <form onSubmit={handleCreateDailyTask} className="mb-4 p-3 bg-green-900/10 border border-green-700/30">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="w-full bg-black/70 border border-green-900/50 px-3 py-2 text-sm text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono mb-3"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-mono">Tier</label>
              <select
                value={newTask.tier}
                onChange={(e) => setNewTask({ ...newTask, tier: e.target.value as TaskTier })}
                className="w-full bg-black/70 border border-green-900/50 px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-green-500 font-mono"
              >
                <option value="S">S - Critical</option>
                <option value="A">A - Important</option>
                <option value="B">B - Maintenance</option>
                <option value="C">C - Chores</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block font-mono">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value as Category })}
                className="w-full bg-black/70 border border-green-900/50 px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-green-500 font-mono"
              >
                <option value="DEV">DEV</option>
                <option value="ACADEMICS">ACADEMICS</option>
                <option value="HEALTH">HEALTH</option>
                <option value="LIFE">LIFE</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !newTask.title.trim()}
              className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-3 py-2 text-xs text-green-400 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              {isSubmitting ? "Creating..." : "Add Task"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTask({ title: "", tier: "C", category: "LIFE" });
              }}
              className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-400 uppercase font-mono"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Weekly Tasks Section */}
      {todaysWeeklyTasks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-purple-500 uppercase tracking-wider mb-2 font-mono">
            // Weekly Templates (Today)
          </h4>
          <div className="space-y-2">
            {todaysWeeklyTasks.map((task) => (
              <div
                key={task.id}
                className="bg-purple-900/10 border border-purple-700/30 p-3 hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => handleCompleteTask(task.id, true)}
                      className="w-5 h-5 border-2 border-purple-500 rounded hover:bg-purple-500/30 transition-colors flex-shrink-0"
                    />
                    <div>
                      <h5 className="text-sm text-green-400 font-mono">{task.title}</h5>
                      <p className="text-xs text-purple-400 mt-1 font-mono">
                        ⭐ +10 Bonus XP for completing on time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Tasks Section */}
      <div>
        <h4 className="text-xs text-green-500 uppercase tracking-wider mb-2 font-mono">
          // Today&apos;s Specific Tasks
        </h4>
        <div className="space-y-2">
          {dailyTasks.length === 0 ? (
            <div className="text-center text-gray-600 text-xs py-8 font-mono">
              [NO_TASKS_TODAY]
              <br />
              Add tasks for today or move from backlog
            </div>
          ) : (
            dailyTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 border transition-colors group ${TIER_COLORS[task.tier]}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleCompleteTask(task.id, false)}
                      className={`w-5 h-5 border-2 rounded hover:bg-green-500/30 transition-colors flex-shrink-0 mt-0.5 ${
                        task.isCompleted ? "bg-green-500 border-green-500" : "border-green-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 border font-mono ${TIER_COLORS[task.tier]}`}>
                          {task.tier}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">{task.category}</span>
                      </div>
                      <h5 className="text-sm text-green-400 font-mono">{task.title}</h5>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">{task.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
