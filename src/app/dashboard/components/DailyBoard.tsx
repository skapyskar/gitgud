"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    tier: "C" as TaskTier,
    category: "LIFE" as Category,
    deadlineTime: "",
    duration: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);
  // Duration confirmation dialog state
  const [completingTask, setCompletingTask] = useState<{ id: string; isWeekly: boolean; duration: number | null } | null>(null);

  // Optimistic UI: local state for all tasks
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([...dailyTasks]);

  // Sync optimisticTasks with props when dailyTasks change (after server response replaces temp tasks)
  React.useEffect(() => {
    setOptimisticTasks([...dailyTasks]);
  }, [dailyTasks]);

  // Simulate board loading for 600ms (or until tasks are ready)
  React.useEffect(() => {
    const timer = setTimeout(() => setBoardLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const today = new Date();
  const todayDayIndex = today.getDay();

  // Combine all tasks for today (optimistic + weekly templates for today)
  const todaysWeeklyTasks = weeklyTemplates.filter((template) => {
    const days = template.repeatDays?.split(",").map(Number) || [];
    return days.includes(todayDayIndex);
  });
  const allTodayTasks = [
    ...optimisticTasks,
    ...todaysWeeklyTasks
  ];
  const pendingTasks = allTodayTasks.filter(task => !task.isCompleted);
  const completedTasks = allTodayTasks.filter(task => task.isCompleted);

  // Optimistic add
  const handleCreateDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.deadlineTime) return;

    // Close form IMMEDIATELY (optimistic UX)
    setIsCreating(false);
    setIsSubmitting(true);

    // 1. Create a fake task for instant UI
    const tempId = Math.random().toString();
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Build deadline time
    const [hours, minutes] = newTask.deadlineTime.split(':').map(Number);
    const deadlineDate = new Date(utcMidnight);
    deadlineDate.setHours(hours, minutes, 0, 0);

    const optimisticTask: Task = {
      id: tempId,
      title: newTask.title,
      isCompleted: false,
      type: "DAILY",
      tier: newTask.tier,
      category: newTask.category,
      userId,
      plannedDate: utcMidnight,
      createdAt: now,
      updatedAt: now,
      description: null,
      plannedStartTime: null,
      plannedEndTime: null,
      scheduledDate: utcMidnight,
      repeatDays: null,
      completedAt: null,
      basePoints: 10,
      xpWorth: 10,
      isBonus: false,
      timeBonus: 0,
      finalPoints: 0,
      deadline: null,
      deadlineTime: deadlineDate,
      allocatedDuration: newTask.duration ? parseInt(newTask.duration) : null,
      durationMet: false,
      isExpired: false,
    };
    setOptimisticTasks((current) => [optimisticTask, ...current]);

    // Store values before reset
    const taskData = {
      title: newTask.title,
      type: "DAILY",
      tier: newTask.tier,
      category: newTask.category,
      scheduledDate: utcMidnight.toISOString(),
      deadlineTime: deadlineDate.toISOString(),
      allocatedDuration: newTask.duration ? parseInt(newTask.duration) : null,
    };

    // Reset form immediately
    setNewTask({ title: "", tier: "C", category: "LIFE", deadlineTime: "", duration: "" });

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        router.refresh(); // Will replace fake with real
      } else {
        setOptimisticTasks((current) => current.filter(t => t.id !== tempId));
      }
    } catch (error) {
      setOptimisticTasks((current) => current.filter(t => t.id !== tempId));
      console.error("Failed to create daily task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId: string, isWeeklyTask: boolean) => {
    // Find the task to check if it has an allocated duration
    const task = allTodayTasks.find(t => t.id === taskId);

    // If task has allocated duration, show confirmation dialog
    if (task?.allocatedDuration) {
      setCompletingTask({ id: taskId, isWeekly: isWeeklyTask, duration: task.allocatedDuration });
      return;
    }

    // No duration set, complete immediately
    await confirmCompleteTask(taskId, isWeeklyTask, false);
  };

  const confirmCompleteTask = async (taskId: string, isWeeklyTask: boolean, durationMet: boolean) => {
    // Clear the modal
    setCompletingTask(null);

    // Optimistic update: mark task as completed immediately
    const prev = [...optimisticTasks];
    setOptimisticTasks((current) =>
      current.map((t) =>
        t.id === taskId
          ? { ...t, isCompleted: true, completedAt: new Date(), durationMet }
          : t
      )
    );
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          isWeeklyBonus: isWeeklyTask,
          durationMet,
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        // Revert on failure
        setOptimisticTasks(prev);
      }
    } catch (error) {
      // Revert on error
      setOptimisticTasks(prev);
      console.error("Failed to complete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimistic delete
  const handleDeleteTask = async (taskId: string) => {
    const prev = [...optimisticTasks];
    setOptimisticTasks((current) => current.filter((t) => t.id !== taskId));
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setOptimisticTasks(prev);
      }
    } catch (error) {
      setOptimisticTasks(prev);
      console.error("Failed to delete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    // Optimistic update: mark task as uncompleted immediately
    const prev = [...optimisticTasks];
    setOptimisticTasks((current) =>
      current.map((t) =>
        t.id === taskId
          ? { ...t, isCompleted: false, completedAt: null }
          : t
      )
    );
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks/uncomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        // Revert on failure
        setOptimisticTasks(prev);
      }
    } catch (error) {
      // Revert on error
      setOptimisticTasks(prev);
      console.error("Failed to uncomplete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-green-900/30 p-[0.15vw] bg-black/50 flex flex-col h-[calc(100vh-60vh)] min-h-[12vh] max-h-[30vh] lg:h-[calc(100vh-40vh)] lg:max-h-[50vh] relative">
      {(isLoading || boardLoading) && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-green-400 font-mono text-lg animate-pulse">LOADING TASKS...</div>
        </div>
      )}

      {/* Duration Confirmation Modal */}
      {completingTask && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
          <div className="bg-black border-2 border-green-500 p-[1vw] max-w-md w-full">
            <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-green-400 font-mono mb-[0.5vh] uppercase">
              Task Complete?
            </h3>
            <p className="text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 mb-[1vh] font-mono">
              Did you complete this task within <span className="text-green-400 font-bold">{completingTask.duration} minutes</span>?
            </p>
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-yellow-500 mb-[1vh] font-mono">
              +25% XP BONUS if yes!
            </p>

            <div className="flex gap-[0.5vw] pt-[0.3vh]">
              <button
                onClick={() => confirmCompleteTask(completingTask.id, completingTask.isWeekly, true)}
                className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 uppercase tracking-wider font-mono"
              >
                Yes (+25% XP)
              </button>
              <button
                onClick={() => confirmCompleteTask(completingTask.id, completingTask.isWeekly, false)}
                className="flex-1 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 uppercase font-mono"
              >
                No
              </button>
              <button
                onClick={() => setCompletingTask(null)}
                className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-red-400 uppercase font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-[0.5vh]">
        <div className="flex items-center gap-[0.5vw]">
          <span className="w-[0.4vw] h-[0.4vh] min-w-[6px] min-h-[6px] bg-green-500 rounded-full animate-ping"></span>
          <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] font-bold text-green-500 uppercase tracking-wider">
            &gt;&gt; Today&apos;s_Missions
          </h3>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setBoardLoading(true);
              setTimeout(() => setBoardLoading(false), 300);
            }}
            className="text-[clamp(0.5rem,0.7vw,0.75rem)] bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.3vh] text-green-400 uppercase tracking-wider font-mono"
          >
            + Task
          </button>
        )}
      </div>

      <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.5vh] font-mono">
        {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
      </p>

      {/* Create Daily Task Form */}
      {isCreating && (
        <form onSubmit={handleCreateDailyTask} className="mb-[0.5vh] p-[0.5vw] bg-green-900/10 border border-green-700/30">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono mb-[0.5vh]"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-[0.5vw] mb-[0.5vh]">
            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Tier</label>
              <select
                value={newTask.tier}
                onChange={(e) => setNewTask({ ...newTask, tier: e.target.value as TaskTier })}
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
              >
                <option value="S">S - Critical</option>
                <option value="A">A - Important</option>
                <option value="B">B - Maintenance</option>
                <option value="C">C - Chores</option>
              </select>
            </div>

            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value as Category })}
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
              >
                <option value="DEV">DEV</option>
                <option value="ACADEMICS">ACADEMICS</option>
                <option value="HEALTH">HEALTH</option>
                <option value="LIFE">LIFE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[0.5vw] mb-[0.5vh]">
            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Deadline Time *</label>
              <input
                type="time"
                value={newTask.deadlineTime}
                onChange={(e) => setNewTask({ ...newTask, deadlineTime: e.target.value })}
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Duration (min)</label>
              <input
                type="number"
                value={newTask.duration}
                onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                placeholder="e.g. 60"
                min="1"
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-[0.5vw]">
            <button
              type="submit"
              disabled={isSubmitting || !newTask.title.trim() || !newTask.deadlineTime}
              className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              {isSubmitting ? "Creating..." : "Add Task"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTask({ title: "", tier: "C", category: "LIFE", deadlineTime: "", duration: "" });
              }}
              className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-red-400 uppercase font-mono"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2">
        {/* Pending Tasks Section */}
        <div>
          <div className="space-y-[0.3vh]">
            {pendingTasks.length === 0 ? (
              <div className="text-center text-gray-600 text-[clamp(0.6rem,0.85vw,0.875rem)] py-[2vh] font-mono flex flex-col items-center justify-center">
                <div className="text-[clamp(0.8rem,1.3vw,1.25rem)] mb-[0.3vh]">[NO_TASKS_TODAY]</div>
                <div className="text-[clamp(0.5rem,0.7vw,0.75rem)]">Add tasks for today or move from backlog</div>
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-[0.5vw] border transition-colors group ${TIER_COLORS[task.tier]}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-[0.5vw] flex-1">
                      <button
                        onClick={() => handleCompleteTask(task.id, task.type === 'WEEKLY')}
                        className={`w-[1vw] h-[1vh] min-w-[16px] min-h-[16px] border-2 rounded hover:bg-green-500/30 transition-colors flex-shrink-0 mt-0.5 ${task.type === 'WEEKLY' ? 'border-purple-500' : 'border-green-500'}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-[0.3vw] mb-[0.2vh]">
                          <span className={`text-[clamp(0.5rem,0.7vw,0.75rem)] px-[0.3vw] py-[0.1vh] border font-mono ${TIER_COLORS[task.tier]}`}>
                            {task.tier}
                          </span>
                          <span className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 font-mono">{task.category}</span>
                        </div>
                        <h5 className="text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 font-mono">{task.title}</h5>
                        {/* Deadline and Duration Info */}
                        <div className="flex gap-[0.5vw] mt-[0.2vh] flex-wrap">
                          {task.deadlineTime && (
                            <span className="text-[clamp(0.45rem,0.6vw,0.65rem)] text-yellow-500 font-mono">
                              ⏰ {new Date(task.deadlineTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {task.allocatedDuration && (
                            <span className="text-[clamp(0.45rem,0.6vw,0.65rem)] text-cyan-500 font-mono">
                              ⏱ {task.allocatedDuration}min
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mt-[0.2vh] font-mono">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono ml-[0.3vw]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <div className="mt-[0.5vh]">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 uppercase tracking-wider mb-[0.3vh] font-mono hover:text-gray-400 transition-colors"
            >
              <span>✓ Completed ({completedTasks.length})</span>
              <span>{showCompleted ? "▼" : "▶"}</span>
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border border-gray-800 bg-gray-900/30 transition-colors group opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleUncompleteTask(task.id)}
                          className="w-5 h-5 border-2 rounded bg-green-500 border-green-500 hover:bg-green-500/50 transition-colors flex-shrink-0 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 border border-gray-700 text-gray-500 font-mono">
                              {task.tier}
                            </span>
                            <span className="text-xs text-gray-600 font-mono">{task.category}</span>
                          </div>
                          <h5 className="text-sm text-gray-500 font-mono line-through">{task.title}</h5>
                          {task.finalPoints && (
                            <p className="text-xs text-green-600 mt-1 font-mono">+{task.finalPoints} XP</p>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
