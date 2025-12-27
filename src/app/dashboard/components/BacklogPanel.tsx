"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskTier, Category } from "../../../../prisma/generated/client";

interface BacklogPanelProps {
  tasks: Task[];
  userId: string;
}

export default function BacklogPanel({ tasks, userId }: BacklogPanelProps) {
  const router = useRouter();
  const [newTask, setNewTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  // Optimistic UI: local state for tasks
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([...tasks]);
  // Track temp ID to real ID mapping after creation completes
  const [tempToRealIdMap, setTempToRealIdMap] = useState<Record<string, string>>({});

  // Sync optimisticTasks with props when tasks change (after server response replaces temp tasks)
  useEffect(() => {
    setOptimisticTasks([...tasks]);
  }, [tasks]);

  // Move to daily modal state
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [moveTaskTier, setMoveTaskTier] = useState<TaskTier>("C");
  const [moveTaskCategory, setMoveTaskCategory] = useState<Category>("LIFE");
  const [moveDeadlineTime, setMoveDeadlineTime] = useState("");
  const [moveDuration, setMoveDuration] = useState("");
  // Delete confirmation state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Helper: Get minimum deadline time (current time rounded up to next 5 minutes)
  const getMinDeadlineTime = () => {
    const now = new Date();
    // Round up to next 5 minutes
    const minutes = Math.ceil((now.getMinutes() + 1) / 5) * 5;
    const hours = now.getHours() + Math.floor(minutes / 60);
    const finalMinutes = minutes % 60;
    if (hours >= 24) return "23:59"; // Already past end of day
    return `${hours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

  // Helper: Max deadline time is 23:59
  const MAX_DEADLINE_TIME = "23:59";

  // Helper: Calculate max duration in minutes based on selected deadline time
  const getMaxDuration = () => {
    if (!moveDeadlineTime) return 999;
    const now = new Date();
    const [deadlineHours, deadlineMinutes] = moveDeadlineTime.split(':').map(Number);
    const deadlineDate = new Date(now);
    deadlineDate.setHours(deadlineHours, deadlineMinutes, 0, 0);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return Math.max(1, diffMinutes);
  };

  // Helper: Check if deadline time is valid (in the future)
  const isDeadlineValid = () => {
    if (!moveDeadlineTime) return false;
    const now = new Date();
    const [hours, minutes] = moveDeadlineTime.split(':').map(Number);
    const deadlineDate = new Date(now);
    deadlineDate.setHours(hours, minutes, 0, 0);
    return deadlineDate.getTime() > now.getTime();
  };

  // Separate completed and incomplete tasks
  const incompleteTasks = optimisticTasks
    .filter(task => !task.isCompleted)
    .sort((a, b) => {
      // Sort by deadline ascending (tasks without deadline go to the end)
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  const completedTasks = optimisticTasks.filter(task => task.isCompleted);

  // Optimistic add
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsAdding(true);
    setIsLoading(true);
    // 1. Create a fake task for instant UI
    const tempId = Math.random().toString();
    const now = new Date();
    const tempTask: Task = {
      id: tempId,
      title: newTask,
      isCompleted: false,
      type: "BACKLOG",
      userId,
      deadline: deadline ? new Date(deadline) : null,
      createdAt: now,
      updatedAt: now,
      tier: "C",
      category: "LIFE",
      description: null,
      plannedDate: now,
      plannedStartTime: null,
      plannedEndTime: null,
      scheduledDate: null,
      repeatDays: null,
      completedAt: null,
      basePoints: 10,
      xpWorth: 10,
      isBonus: false,
      timeBonus: 0,
      finalPoints: 0,
      // New fields for deadline/duration system
      deadlineTime: null,
      allocatedDuration: null,
      durationMet: false,
      isExpired: false,
    };
    setOptimisticTasks((current) => [tempTask, ...current]);

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask,
          type: "BACKLOG",
          deadline: deadline || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdTask = data.task;
        // Map temp ID to real ID so task can be moved immediately
        setTempToRealIdMap(prev => ({ ...prev, [tempId]: createdTask.id }));
        // Update the task in optimistic state with the real ID
        setOptimisticTasks((current) =>
          current.map(t => t.id === tempId ? { ...t, id: createdTask.id } : t)
        );
        setNewTask("");
        setDeadline("");
        router.refresh(); // Will sync with server state
      } else {
        setOptimisticTasks((current) => current.filter(t => t.id !== tempId));
      }
    } catch (error) {
      setOptimisticTasks((current) => current.filter(t => t.id !== tempId));
      console.error("Failed to create backlog task:", error);
    } finally {
      setIsLoading(false);
      setIsAdding(false);
    }
  };

  const handleMoveToDaily = async (taskId: string) => {
    // Validate that tier and category are selected
    if (!moveTaskTier || !moveTaskCategory) {
      alert("Please select both Task Tier and Category before moving to daily tasks.");
      return;
    }

    // The task ID should already be the real ID from the updated optimistic state
    // No need to check for temp IDs since we update them immediately after creation

    // Optimistic update: remove task from backlog immediately
    const prev = [...optimisticTasks];
    setOptimisticTasks((current) => current.filter((t) => t.id !== taskId));
    setIsLoading(true);

    try {
      // Use UTC midnight to match server-side date handling
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Build deadline time if provided
      let deadlineTimeValue = null;
      if (moveDeadlineTime) {
        const [hours, minutes] = moveDeadlineTime.split(':').map(Number);
        const deadlineDate = new Date(today);
        deadlineDate.setHours(hours, minutes, 0, 0);
        deadlineTimeValue = deadlineDate.toISOString();
      }

      const res = await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          type: "DAILY",
          plannedDate: today.toISOString(),
          tier: moveTaskTier,
          category: moveTaskCategory,
          deadlineTime: deadlineTimeValue,
          allocatedDuration: moveDuration ? parseInt(moveDuration) : null,
        }),
      });

      if (res.ok) {
        setMovingTaskId(null);
        setMoveTaskTier("C");
        setMoveTaskCategory("LIFE");
        setMoveDeadlineTime("");
        setMoveDuration("");
        router.refresh();
      } else {
        // Revert on failure
        setOptimisticTasks(prev);
        const errorData = await res.json();
        alert(`Failed to move task: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Revert on error
      setOptimisticTasks(prev);
      console.error("Failed to move task:", error);
      alert("Failed to move task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show delete confirmation dialog
  const promptDelete = (taskId: string) => {
    setDeletingTaskId(taskId);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!deletingTaskId) return;

    const taskId = deletingTaskId;
    setDeletingTaskId(null); // Close dialog

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
    <div className="border border-green-900/30 p-[0.3vw] bg-black/50 flex flex-col h-[calc(100vh-52vh)] min-h-[12vh] max-h-[35vh] lg:h-[calc(100vh-40vh)] lg:max-h-[50vh] relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-green-400 font-mono text-sm animate-pulse">LOADING...</div>
        </div>
      )}

      {/* Move to Daily Modal */}
      {movingTaskId && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
          <div className="bg-black border-2 border-green-500 p-[1vw] max-w-md w-full">
            <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-green-400 font-mono mb-[0.5vh] uppercase">Schedule for Today</h3>
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-400 mb-[1vh] font-mono">Select tier and category before adding to daily tasks</p>

            <div className="space-y-[0.5vh]">
              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Task Tier *</label>
                <select
                  value={moveTaskTier}
                  onChange={(e) => setMoveTaskTier(e.target.value as TaskTier)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                  required
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
                  value={moveTaskCategory}
                  onChange={(e) => setMoveTaskCategory(e.target.value as Category)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                  required
                >
                  <option value="DEV">DEV</option>
                  <option value="ACADEMICS">ACADEMICS</option>
                  <option value="HEALTH">HEALTH</option>
                  <option value="LIFE">LIFE</option>
                </select>
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Deadline Time * (now - 23:59)</label>
                <input
                  type="time"
                  value={moveDeadlineTime}
                  onChange={(e) => {
                    setMoveDeadlineTime(e.target.value);
                    // Auto-clamp duration when deadline changes
                    if (moveDuration) {
                      const now = new Date();
                      const [h, m] = e.target.value.split(':').map(Number);
                      const dl = new Date(now); dl.setHours(h, m, 0, 0);
                      const maxMins = Math.max(1, Math.floor((dl.getTime() - now.getTime()) / 60000));
                      if (parseInt(moveDuration) > maxMins) {
                        setMoveDuration(maxMins.toString());
                      }
                    }
                  }}
                  min={getMinDeadlineTime()}
                  max={MAX_DEADLINE_TIME}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                  required
                />
                {moveDeadlineTime && (
                  <span className={`text-[clamp(0.4rem,0.5vw,0.6rem)] font-mono ${isDeadlineValid() ? 'text-gray-600' : 'text-red-500'}`}>
                    {isDeadlineValid() ? `${getMaxDuration()} min available` : '⚠️ Time must be in the future!'}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Duration (minutes)</label>
                <input
                  type="number"
                  value={moveDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const maxDur = getMaxDuration();
                    setMoveDuration(Math.min(val, maxDur).toString());
                  }}
                  placeholder={moveDeadlineTime ? `max ${getMaxDuration()}` : "e.g. 60"}
                  min="1"
                  max={getMaxDuration()}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
                />
              </div>

              <div className="flex gap-[0.5vw] pt-[0.3vh]">
                <button
                  onClick={() => handleMoveToDaily(movingTaskId)}
                  disabled={!moveDeadlineTime || !isDeadlineValid()}
                  className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 uppercase tracking-wider font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  → Move to Today
                </button>
                <button
                  onClick={() => {
                    setMovingTaskId(null);
                    setMoveTaskTier("C");
                    setMoveTaskCategory("LIFE");
                    setMoveDeadlineTime("");
                    setMoveDuration("");
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

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-[1vw]">
          <div className="bg-black border-2 border-red-500 p-[1vw] max-w-md w-full">
            <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] text-red-400 font-mono mb-[0.5vh] uppercase">
              Delete Task?
            </h3>
            <p className="text-[clamp(0.6rem,0.85vw,0.875rem)] text-gray-400 mb-[1vh] font-mono">
              This task will be <span className="text-red-400 font-bold">permanently deleted</span>.
            </p>
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-yellow-500 mb-[1vh] font-mono">
              ⚠️ This action cannot be undone!
            </p>

            <div className="flex gap-[0.5vw] pt-[0.3vh]">
              <button
                onClick={confirmDelete}
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

      <div className="flex items-center gap-[0.5vw] mb-[0.5vh]">
        <span className="w-[0.4vw] h-[0.4vh] min-w-[6px] min-h-[6px] bg-yellow-500 rounded-full animate-pulse"></span>
        <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] font-bold text-green-500 uppercase tracking-wider">
          &gt;&gt; The_Dump
        </h3>
      </div>

      <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.5vh] font-mono">
        Schedule when ready
      </p>

      <form onSubmit={handleAddTask} className="mb-[0.5vh] space-y-[0.3vh]">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono"
          disabled={isAdding}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
          disabled={isAdding}
        />
        <button
          type="submit"
          disabled={isAdding || !newTask.trim()}
          className="w-full bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-3 py-2 text-xs text-green-400 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
        >
          {isAdding ? "Adding..." : "+ Add to Dump"}
        </button>
      </form>

      {/* Task List */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {incompleteTasks.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8 font-mono">
            [EMPTY_BACKLOG]
            <br />
            No pending tasks
          </div>
        ) : (
          incompleteTasks.map((task) => (
            <div
              key={task.id}
              className="bg-black/70 border border-yellow-700/30 p-3 hover:border-yellow-500/50 transition-colors group"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <h4 className="text-sm text-green-400 font-mono">{task.title}</h4>
              </div>

              {task.deadline && (
                <div className="text-xs text-yellow-600 mb-2 font-mono">
                  Deadline: {new Date(task.deadline).toLocaleDateString()}
                </div>
              )}

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setMovingTaskId(task.id)}
                  className="text-xs bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 px-2 py-1 text-blue-400 font-mono"
                >
                  → Today
                </button>
                <button
                  onClick={() => promptDelete(task.id)}
                  className="text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 px-2 py-1 text-red-400 font-mono"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}

        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono hover:text-green-500 transition-colors"
            >
              <span>✓ Completed ({completedTasks.length})</span>
              <span>{showCompleted ? "▼" : "▶"}</span>
            </button>

            {showCompleted && (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-black/70 border border-gray-800 p-3 hover:border-gray-700 transition-colors group opacity-60"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="text-sm text-gray-500 font-mono line-through">{task.title}</h4>
                    </div>

                    {task.finalPoints && (
                      <div className="text-xs text-green-600 mb-2 font-mono">
                        +{task.finalPoints} XP
                      </div>
                    )}

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleUncompleteTask(task.id)}
                        className="text-xs bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700/50 px-2 py-1 text-yellow-400 font-mono"
                      >
                        ↺ Uncomplete
                      </button>
                      <button
                        onClick={() => promptDelete(task.id)}
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 px-2 py-1 text-red-400 font-mono"
                      >
                        Delete
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
