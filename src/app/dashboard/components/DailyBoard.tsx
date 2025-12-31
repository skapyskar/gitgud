"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskTier, Category } from "../../../../prisma/generated/client";
import TaskTimer from "./TaskTimer";

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
    frequency: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showBacklog, setShowBacklog] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<{ id: string; isWeekly: boolean; duration: number | null } | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [dismissedWeeklyIds, setDismissedWeeklyIds] = useState<string[]>([]);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(60);
  const [timerHasAllocatedDuration, setTimerHasAllocatedDuration] = useState<boolean>(false);
  const [movingBacklogTaskId, setMovingBacklogTaskId] = useState<string | null>(null);
  const [moveBacklogTier, setMoveBacklogTier] = useState<TaskTier>("C");
  const [moveBacklogCategory, setMoveBacklogCategory] = useState<Category>("LIFE");
  const [moveBacklogDeadlineTime, setMoveBacklogDeadlineTime] = useState("");
  const [moveBacklogDuration, setMoveBacklogDuration] = useState("");
  const [moveBacklogFrequency, setMoveBacklogFrequency] = useState<string>("1"); // New state for backlog move

  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([...dailyTasks]);

  React.useEffect(() => {
    setOptimisticTasks([...dailyTasks]);
  }, [dailyTasks]);
  React.useEffect(() => {
    const timer = setTimeout(() => setBoardLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(`dismissedWeekly_${today}`);
    if (stored) {
      try {
        setDismissedWeeklyIds(JSON.parse(stored));
      } catch {
        setDismissedWeeklyIds([]);
      }
    }
  }, []);

  const today = new Date();
  const todayDayIndex = today.getDay();

  const getMinDeadlineTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = (now.getMinutes() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const MAX_DEADLINE_TIME = "23:59";

  const getMaxDuration = () => {
    if (!newTask.deadlineTime) return 999;
    const now = new Date();
    const [deadlineHours, deadlineMinutes] = newTask.deadlineTime.split(':').map(Number);
    const deadlineDate = new Date(now);
    deadlineDate.setHours(deadlineHours, deadlineMinutes, 0, 0);

    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return Math.max(1, diffMinutes);
  };

  React.useEffect(() => {
    if (newTask.deadlineTime && newTask.duration) {
      const maxDur = getMaxDuration();
      const currentDur = parseInt(newTask.duration);
      if (currentDur > maxDur) {
        setNewTask(prev => ({ ...prev, duration: maxDur.toString() }));
      }
    }
  }, [newTask.deadlineTime]);

  const getTierBaseXP = (tier: TaskTier): number => {
    switch (tier) {
      case "S": return 100;
      case "A": return 60;
      case "B": return 30;
      case "C": return 10;
      default: return 10;
    }
  };

  const todaysWeeklyTasks = weeklyTemplates.filter((template) => {
    const days = template.repeatDays?.split(",").map(Number) || [];
    return days.includes(todayDayIndex) && !dismissedWeeklyIds.includes(template.id);
  });

  const todayISO = today.toISOString().slice(0, 10);
  const todaysTasks = optimisticTasks.filter(task =>
    task.scheduledDate && new Date(task.scheduledDate).toISOString().slice(0, 10) === todayISO
  );
  const backlogTasks = optimisticTasks.filter(task =>
    task.scheduledDate &&
    new Date(task.scheduledDate).toISOString().slice(0, 10) < todayISO &&
    !task.isCompleted
  );

  const allTodayTasks = [
    ...todaysTasks,
    ...todaysWeeklyTasks
  ];

  const isTaskExpired = (task: Task | WeeklyTask): boolean => {
    if (!task.deadlineTime) return false;
    const now = new Date();
    const deadlineDate = new Date(task.deadlineTime);
    const todayDeadline = new Date();
    todayDeadline.setHours(deadlineDate.getHours(), deadlineDate.getMinutes(), 0, 0);
    return now.getTime() > todayDeadline.getTime();
  };

  const pendingTasks = allTodayTasks
    .filter(task => !task.isCompleted)
    .sort((a, b) => {
      const aTime = a.deadlineTime ? new Date(a.deadlineTime).getTime() : Infinity;
      const bTime = b.deadlineTime ? new Date(b.deadlineTime).getTime() : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      const aDuration = a.allocatedDuration ?? Infinity;
      const bDuration = b.allocatedDuration ?? Infinity;
      if (aDuration !== bDuration) return aDuration - bDuration;
      return a.title.localeCompare(b.title);
    });
  const completedTasks = allTodayTasks.filter(task => task.isCompleted);

  const handleCreateDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.deadlineTime) return;
    setIsCreating(false);
    setIsSubmitting(true);

    const tempId = Math.random().toString();
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [hours, minutes] = newTask.deadlineTime.split(':').map(Number);
    const deadlineDate = new Date();
    deadlineDate.setHours(hours, minutes, 0, 0);

    const optimisticTask: Task & { frequency: number, completedFrequency: number } = {
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
      frequency: parseInt(newTask.frequency) || 1,
      completedFrequency: 0,
    };
    // @ts-ignore - casting to Task for state update
    setOptimisticTasks((current) => [optimisticTask as Task, ...current]);

    const taskData = {
      title: newTask.title,
      type: "DAILY",
      tier: newTask.tier,
      category: newTask.category,
      scheduledDate: utcMidnight.toISOString(),
      deadlineTime: deadlineDate.toISOString(),
      allocatedDuration: newTask.duration ? parseInt(newTask.duration) : null,
      frequency: parseInt(newTask.frequency) || 1,
    };

    setNewTask({ title: "", tier: "C", category: "LIFE", deadlineTime: "", duration: "", frequency: "1" });

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        router.refresh();
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
    const task = allTodayTasks.find(t => t.id === taskId);
    if (task?.allocatedDuration) {
      setCompletingTask({ id: taskId, isWeekly: isWeeklyTask, duration: task.allocatedDuration });
      return;
    }

    await confirmCompleteTask(taskId, isWeeklyTask, false);
  };

  const confirmCompleteTask = async (taskId: string, isWeeklyTask: boolean, durationMet: boolean) => {
    setCompletingTask(null);
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
        setOptimisticTasks(prev);
      }
    } catch (error) {
      setOptimisticTasks(prev);
      console.error("Failed to complete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const promptDeleteTask = (taskId: string) => {
    setDeletingTaskId(taskId);
  };
  const confirmDeleteTask = async () => {
    if (!deletingTaskId) return;

    const taskId = deletingTaskId;
    setDeletingTaskId(null); // Close dialog

    const isWeeklyTask = weeklyTemplates.some(t => t.id === taskId);

    if (isWeeklyTask) {
      const today = new Date().toISOString().slice(0, 10);
      const newDismissed = [...dismissedWeeklyIds, taskId];
      setDismissedWeeklyIds(newDismissed);
      localStorage.setItem(`dismissedWeekly_${today}`, JSON.stringify(newDismissed));
      return;
    }
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
        setOptimisticTasks(prev);
      }
    } catch (error) {
      setOptimisticTasks(prev);
      console.error("Failed to uncomplete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Backlog handlers
  const getBacklogMaxDuration = () => {
    if (!moveBacklogDeadlineTime) return 999;
    const now = new Date();
    const [h, m] = moveBacklogDeadlineTime.split(':').map(Number);
    const dl = new Date(now);
    dl.setHours(h, m, 0, 0);
    const diffMs = dl.getTime() - now.getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  };

  const isBacklogDeadlineValid = () => {
    if (!moveBacklogDeadlineTime) return false;
    const now = new Date();
    const [h, m] = moveBacklogDeadlineTime.split(':').map(Number);
    const dl = new Date(now);
    dl.setHours(h, m, 0, 0);
    return dl.getTime() > now.getTime();
  };

  const handleMoveBacklogToToday = async () => {
    if (!movingBacklogTaskId || !moveBacklogDeadlineTime || !isBacklogDeadlineValid()) return;

    const prev = [...optimisticTasks];
    setOptimisticTasks(current => current.filter(t => t.id !== movingBacklogTaskId));
    setIsLoading(true);

    try {
      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);

      const [hours, minutes] = moveBacklogDeadlineTime.split(':').map(Number);
      const deadlineDate = new Date();
      deadlineDate.setHours(hours, minutes, 0, 0);

      const res = await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: movingBacklogTaskId,
          scheduledDate: todayDate.toISOString(),
          tier: moveBacklogTier,
          category: moveBacklogCategory,
          deadlineTime: deadlineDate.toISOString(),
          allocatedDuration: moveBacklogDuration ? parseInt(moveBacklogDuration) : null,
          frequency: parseInt(moveBacklogFrequency) || 1,
        }),
      });

      if (res.ok) {
        setMovingBacklogTaskId(null);
        setMoveBacklogTier("C");
        setMoveBacklogCategory("LIFE");
        setMoveBacklogDeadlineTime("");
        setMoveBacklogDuration("");
        setMoveBacklogFrequency("1");
        router.refresh();
      } else {
        setOptimisticTasks(prev);
      }
    } catch (error) {
      setOptimisticTasks(prev);
      console.error("Failed to move backlog task to today:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveBacklogToDump = async (taskId: string) => {
    const prev = [...optimisticTasks];
    setOptimisticTasks(current => current.filter(t => t.id !== taskId));
    setIsLoading(true);

    try {
      const res = await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          type: "BACKLOG",
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        setOptimisticTasks(prev);
      }
    } catch (error) {
      setOptimisticTasks(prev);
      console.error("Failed to move backlog task to dump:", error);
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
      {completingTask && (() => {
        const taskComp = allTodayTasks.find(t => t.id === completingTask.id);
        // @ts-ignore
        const freq = taskComp?.frequency || 1;
        const bonusPct = freq > 1 ? (25 / freq).toFixed(1).replace(/\.0$/, '') : "25";

        return (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
            <div className="bg-black border-2 border-green-500 p-[1vw] max-w-md w-full">
              <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-green-400 font-mono mb-[0.5vh] uppercase">
                Task Complete?
              </h3>
              <p className="text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 mb-[1vh] font-mono">
                Did you complete this task within <span className="text-green-400 font-bold">{completingTask.duration} minutes</span>?
              </p>
              <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-yellow-500 mb-[1vh] font-mono">
                +{bonusPct}% XP BONUS if yes!
              </p>

              <div className="flex gap-[0.5vw] pt-[0.3vh]">
                <button
                  onClick={() => confirmCompleteTask(completingTask.id, completingTask.isWeekly, true)}
                  className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 uppercase tracking-wider font-mono"
                >
                  Yes (+{bonusPct}% XP)
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
        );
      })()}
      {timerTaskId && (
        <TaskTimer
          taskId={timerTaskId}
          initialMinutes={timerDuration}
          hasAllocatedDuration={timerHasAllocatedDuration}
          onClose={() => setTimerTaskId(null)}
          onTimerComplete={() => {
            const task = allTodayTasks.find(t => t.id === timerTaskId);
            if (task) {
              confirmCompleteTask(timerTaskId, task.type === 'WEEKLY', true);
            }
            setTimerTaskId(null);
          }}
        />
      )}

      {deletingTaskId && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
          <div className="bg-black border-2 border-red-500 p-[1vw] max-w-md w-full">
            <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-red-400 font-mono mb-[0.5vh] uppercase">
              Delete Task?
            </h3>
            <p className="text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 mb-[1vh] font-mono">
              This task will be <span className="text-red-400 font-bold">permanently deleted</span> and removed from your efficiency calculations.
            </p>
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-yellow-500 mb-[1vh] font-mono">
              ⚠️ This action cannot be undone!
            </p>

            <div className="flex gap-[0.5vw] pt-[0.3vh]">
              <button
                onClick={confirmDeleteTask}
                className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-red-400 uppercase tracking-wider font-mono"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingTaskId(null)}
                className="flex-1 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-700 px-[0.5vw] py-[0.5vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 uppercase font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {movingBacklogTaskId && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
          <div className="bg-black border-2 border-green-500 p-[1vw] max-w-md w-full">
            <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-green-400 font-mono mb-[0.5vh] uppercase">Reschedule for Today</h3>
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-400 mb-[1vh] font-mono">Set deadline and details for today</p>

            <div className="space-y-[0.5vh]">
              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Task Tier *</label>
                <select
                  value={moveBacklogTier}
                  onChange={(e) => setMoveBacklogTier(e.target.value as TaskTier)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                >
                  <option value="S">S - Critical (High XP)</option>
                  <option value="A">A - Important</option>
                  <option value="B">B - Maintenance</option>
                  <option value="C">C - Chores</option>
                </select>
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Category *</label>
                <select
                  value={moveBacklogCategory}
                  onChange={(e) => setMoveBacklogCategory(e.target.value as Category)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                >
                  <option value="DEV">DEV</option>
                  <option value="ACADEMICS">ACADEMICS</option>
                  <option value="HEALTH">HEALTH</option>
                  <option value="LIFE">LIFE</option>
                </select>
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Deadline Time *</label>
                <input
                  type="time"
                  value={moveBacklogDeadlineTime}
                  onChange={(e) => {
                    setMoveBacklogDeadlineTime(e.target.value);
                    if (moveBacklogDuration) {
                      const now = new Date();
                      const [h, m] = e.target.value.split(':').map(Number);
                      const dl = new Date(now); dl.setHours(h, m, 0, 0);
                      const maxMins = Math.max(1, Math.floor((dl.getTime() - now.getTime()) / 60000));
                      if (parseInt(moveBacklogDuration) > maxMins) {
                        setMoveBacklogDuration(maxMins.toString());
                      }
                    }
                  }}
                  min={getMinDeadlineTime()}
                  max={MAX_DEADLINE_TIME}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                  required
                />
                {moveBacklogDeadlineTime && (
                  <span className={`text-[clamp(0.4rem,0.5vw,0.6rem)] font-mono ${isBacklogDeadlineValid() ? 'text-gray-600' : 'text-red-500'}`}>
                    {isBacklogDeadlineValid() ? `${getBacklogMaxDuration()} min available` : '⚠️ Time must be in the future!'}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Duration (minutes)</label>
                <input
                  type="number"
                  value={moveBacklogDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const maxDur = getBacklogMaxDuration();
                    setMoveBacklogDuration(Math.min(val, maxDur).toString());
                  }}
                  placeholder={moveBacklogDeadlineTime ? `max ${getBacklogMaxDuration()}` : "e.g. 60"}
                  min="1"
                  max={getBacklogMaxDuration()}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
                />
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Frequency</label>
                <input
                  type="number"
                  value={moveBacklogFrequency}
                  onChange={(e) => setMoveBacklogFrequency(e.target.value)}
                  placeholder="1"
                  min="1"
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
                />
              </div>

              <div className="flex gap-[0.5vw] pt-[0.3vh]">
                <button
                  onClick={handleMoveBacklogToToday}
                  disabled={!moveBacklogDeadlineTime || !isBacklogDeadlineValid()}
                  className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 uppercase tracking-wider font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  → Move to Today
                </button>
                <button
                  onClick={() => {
                    setMovingBacklogTaskId(null);
                    setMoveBacklogTier("C");
                    setMoveBacklogCategory("LIFE");
                    setMoveBacklogDeadlineTime("");
                    setMoveBacklogDuration("");
                  }}
                  className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-red-400 uppercase font-mono"
                >
                  Cancel
                </button>
              </div>
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
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Deadline Time * (max 23:59)</label>
              <input
                type="time"
                value={newTask.deadlineTime}
                onChange={(e) => setNewTask({ ...newTask, deadlineTime: e.target.value })}
                min={getMinDeadlineTime()}
                max={MAX_DEADLINE_TIME}
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                required
              />
              <span className="text-[clamp(0.4rem,0.5vw,0.6rem)] text-gray-600 font-mono">
                {newTask.deadlineTime && `${getMaxDuration()} min available`}
              </span>
            </div>

            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Duration (min)</label>
              <input
                type="number"
                value={newTask.duration}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  const maxDur = getMaxDuration();
                  // Clamp to max duration
                  setNewTask({ ...newTask, duration: Math.min(val, maxDur).toString() });
                }}
                placeholder={newTask.deadlineTime ? `max ${getMaxDuration()}` : "e.g. 60"}
                min="1"
                max={getMaxDuration()}
                className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
              />
            </div>
          </div>

          <div className="mb-[0.5vh]">
            <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Frequency (Repeats)</label>
            <input
              type="number"
              value={
                // @ts-ignore
                newTask.frequency
              }
              onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
              placeholder="1"
              min="1"
              className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
            />
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
                setNewTask({ title: "", tier: "C", category: "LIFE", deadlineTime: "", duration: "", frequency: "1" });
              }}
              className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-red-400 uppercase font-mono"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto pr-2">
        <div>
          <div className="space-y-[0.3vh]">
            {pendingTasks.length === 0 ? (
              <div className="text-center text-gray-600 text-[clamp(0.6rem,0.85vw,0.875rem)] py-[2vh] font-mono flex flex-col items-center justify-center">
                <div className="text-[clamp(0.8rem,1.3vw,1.25rem)] mb-[0.3vh]">[NO_TASKS_TODAY]</div>
                <div className="text-[clamp(0.5rem,0.7vw,0.75rem)]">Add tasks for today or move from backlog</div>
              </div>
            ) : (
              pendingTasks.map((task) => {
                const expired = isTaskExpired(task);
                // @ts-ignore
                const frequency = task.frequency || 1;
                // @ts-ignore
                const completedFrequency = task.completedFrequency || 0;

                return (
                  <div
                    key={task.id}
                    className={`p-[0.5vw] border transition-colors group ${expired ? 'border-gray-700 bg-gray-900/30 opacity-60' : TIER_COLORS[task.tier]}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-[0.5vw] flex-1">
                        {expired ? (
                          <div className="w-[1vw] h-[1vh] min-w-[16px] min-h-[16px] border-2 border-gray-600 rounded bg-gray-700/50 flex-shrink-0 mt-0.5 flex items-center justify-center">
                            <span className="text-[0.5rem] text-gray-500">✕</span>
                          </div>
                        ) : (
                          // Only show completion button if frequency is 1, otherwise ticks are shown below title
                          frequency === 1 && (
                            <button
                              onClick={() => handleCompleteTask(task.id, task.type === 'WEEKLY')}
                              className={`w-[1vw] h-[1vh] min-w-[16px] min-h-[16px] border-2 rounded hover:bg-green-500/30 transition-colors flex-shrink-0 mt-0.5 ${task.type === 'WEEKLY' ? 'border-purple-500' : 'border-green-500'}`}
                            />
                          )
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-[0.3vw] mb-[0.2vh]">
                            <span className={`text-[clamp(0.5rem,0.7vw,0.75rem)] px-[0.3vw] py-[0.1vh] border font-mono ${expired ? 'border-gray-700 text-gray-500' : TIER_COLORS[task.tier]}`}>
                              {task.tier}
                            </span>
                            <span className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 font-mono">{task.category}</span>
                            {expired ? (
                              <span className="text-[clamp(0.45rem,0.6vw,0.65rem)] text-red-500 font-mono font-bold">
                                EXPIRED (0 XP)
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[clamp(0.45rem,0.6vw,0.65rem)] text-green-500 font-mono font-bold">
                                  +{getTierBaseXP(task.tier)} XP
                                </span>
                                {frequency > 1 && (
                                  <span className="text-[0.6rem] text-gray-400 font-mono">
                                    ({completedFrequency}/{frequency})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <h5 className={`text-[clamp(0.6rem,0.85vw,0.875rem)] font-mono ${expired ? 'text-gray-500 line-through' : 'text-green-400'}`}>{task.title}</h5>
                          <div className="flex gap-[0.5vw] mt-[0.2vh] flex-wrap">
                            {task.deadlineTime && (
                              <span className={`text-[clamp(0.45rem,0.6vw,0.65rem)] font-mono ${expired ? 'text-red-500' : 'text-yellow-500'}`}>
                                ⏰ {new Date(task.deadlineTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {expired && '(PASSED)'}
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
                          {!expired && frequency > 1 && (
                            <div className="flex items-center gap-1 flex-wrap mt-[0.5vh]">
                              {Array.from({ length: frequency }).map((_, idx) => {
                                const isFilled = idx < completedFrequency;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (isFilled) {
                                        if (idx === completedFrequency - 1) {
                                          handleUncompleteTask(task.id);
                                        }
                                      } else {
                                        if (idx === completedFrequency) {
                                          handleCompleteTask(task.id, task.type === 'WEEKLY');
                                        }
                                      }
                                    }}
                                    className={`w-[0.8vw] h-[0.8vw] min-w-[12px] min-h-[12px] border rounded transition-colors ${isFilled
                                      ? (task.type === 'WEEKLY' ? 'bg-purple-500 border-purple-500' : 'bg-green-500 border-green-500')
                                      : (task.type === 'WEEKLY' ? 'border-purple-500 hover:bg-purple-500/30' : 'border-green-500 hover:bg-green-500/30')
                                      }`}
                                  />
                                );
                              })}
                              <button
                                onClick={() => {
                                  const remaining = frequency - completedFrequency;
                                  if (remaining > 0) {
                                    const prev = [...optimisticTasks];
                                    setOptimisticTasks((current) =>
                                      current.map((t) =>
                                        t.id === task.id
                                          ? { ...t, isCompleted: true, completedFrequency: frequency, completedAt: new Date(), durationMet: false }
                                          : t
                                      )
                                    );
                                    fetch("/api/tasks/complete", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        taskId: task.id,
                                        isWeeklyBonus: task.type === 'WEEKLY',
                                        durationMet: false,
                                        count: remaining
                                      }),
                                    }).then(res => {
                                      if (res.ok) router.refresh();
                                      else setOptimisticTasks(prev);
                                    });
                                  }
                                }}
                                className="ml-1 text-[0.6rem] text-green-400 font-mono hover:underline"
                                title="Tick All"
                              >
                                [ALL]
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-center">
                        {!expired && (
                          <button
                            onClick={() => {
                              setTimerTaskId(task.id);
                              setTimerDuration(task.allocatedDuration || 60);
                              setTimerHasAllocatedDuration(!!task.allocatedDuration);
                            }}
                            className="text-lg lg:text-xl text-cyan-500 hover:text-cyan-400 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all font-mono p-1"
                            title="Start Timer"
                          >
                            ⏱️
                          </button>
                        )}
                        <button
                          onClick={() => promptDeleteTask(task.id)}
                          className="text-lg lg:text-xl text-red-500 hover:text-red-400 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all font-mono p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
                            {/* @ts-ignore */}
                            {task.frequency > 1 && (
                              <span className="text-[10px] text-gray-500 font-mono ml-1">
                                {/* @ts-ignore */}
                                ({task.completedFrequency}/{task.frequency})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h5 className="text-sm text-gray-500 font-mono line-through">{task.title}</h5>
                            {/* @ts-ignore */}
                            {task.frequency > 1 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1 opacity-50">
                                {/* @ts-ignore */}
                                {Array.from({ length: task.frequency }).map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-[10px] h-[10px] border rounded ${
                                      // @ts-ignore
                                      idx < task.completedFrequency
                                        ? (task.type === 'WEEKLY' ? 'bg-purple-500/50 border-purple-500' : 'bg-green-500/50 border-green-500')
                                        : 'border-gray-600'
                                      }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {task.finalPoints && (
                            <p className="text-xs text-green-600 mt-1 font-mono">+{task.finalPoints} XP</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => promptDeleteTask(task.id)}
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
        {backlogTasks.length > 0 && (
          <div className="mt-[0.5vh]">
            <button
              onClick={() => setShowBacklog(!showBacklog)}
              className="w-full flex items-center justify-between text-[clamp(0.5rem,0.7vw,0.75rem)] text-orange-500 uppercase tracking-wider mb-[0.3vh] font-mono hover:text-orange-400 transition-colors"
            >
              <span>⏳ Backlog ({backlogTasks.length})</span>
              <span>{showBacklog ? "▼" : "▶"}</span>
            </button>
            {showBacklog && (
              <div className="space-y-2">
                {backlogTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border border-orange-800/50 bg-orange-900/10 transition-colors group opacity-70"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 border border-orange-700/50 text-orange-500 font-mono">
                            {task.tier}
                          </span>
                          <span className="text-xs text-orange-600 font-mono">{task.category}</span>
                          <span className="text-xs text-gray-600 font-mono">
                            {task.scheduledDate && new Date(task.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {/* @ts-ignore */}
                          {task.frequency > 1 && (
                            <span className="text-[10px] text-gray-500 font-mono ml-1">
                              {/* @ts-ignore */}
                              ({task.completedFrequency}/{task.frequency})
                            </span>
                          )}
                        </div>
                        <h5 className="text-sm text-orange-400/70 font-mono line-through">{task.title}</h5>
                        {/* @ts-ignore */}
                        {task.frequency > 1 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1 opacity-50">
                            {/* @ts-ignore */}
                            {Array.from({ length: task.frequency }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-[10px] h-[10px] border rounded ${
                                  // @ts-ignore
                                  idx < task.completedFrequency
                                    ? (task.type === 'WEEKLY' ? 'bg-purple-500/50 border-purple-500' : 'bg-green-500/50 border-green-500')
                                    : 'border-gray-600'
                                  }`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-[clamp(0.4rem,0.55vw,0.65rem)] text-gray-600 font-mono mt-1">
                          (Not counted for efficiency until rescheduled)
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setMovingBacklogTaskId(task.id);
                            setMoveBacklogTier(task.tier);
                            setMoveBacklogCategory(task.category);
                          }}
                          className="text-xs bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 px-2 py-1 text-green-400 font-mono"
                        >
                          → Today
                        </button>
                        <button
                          onClick={() => handleMoveBacklogToDump(task.id)}
                          className="text-xs bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700/50 px-2 py-1 text-yellow-400 font-mono"
                        >
                          → Dump
                        </button>
                        <button
                          onClick={() => promptDeleteTask(task.id)}
                          className="text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 px-2 py-1 text-red-400 font-mono"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}
