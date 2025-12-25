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

  // Separate completed and incomplete tasks
  const incompleteTasks = optimisticTasks.filter(task => !task.isCompleted);
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
        setNewTask("");
        setDeadline("");
        router.refresh(); // Will replace fake with real
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

    // Check if this is a temporary optimistic task (not yet saved to DB)
    // Temporary IDs from Math.random() start with "0." while cuid starts with "c"
    if (taskId.startsWith("0.")) {
      alert("Please wait for the task to finish saving before moving it.");
      return;
    }

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

  // Optimistic delete
  const handleDelete = async (taskId: string) => {
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
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Deadline Time *</label>
                <input
                  type="time"
                  value={moveDeadlineTime}
                  onChange={(e) => setMoveDeadlineTime(e.target.value)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 mb-[0.3vh] block font-mono uppercase">Duration (minutes)</label>
                <input
                  type="number"
                  value={moveDuration}
                  onChange={(e) => setMoveDuration(e.target.value)}
                  placeholder="e.g. 60"
                  min="1"
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono placeholder-gray-600"
                />
              </div>

              <div className="flex gap-[0.5vw] pt-[0.3vh]">
                <button
                  onClick={() => handleMoveToDaily(movingTaskId)}
                  disabled={!moveDeadlineTime}
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
                  onClick={() => handleDelete(task.id)}
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
                        onClick={() => handleDelete(task.id)}
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
