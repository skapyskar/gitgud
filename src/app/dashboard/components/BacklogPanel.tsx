"use client";

import { useState } from "react";
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
  
  // Move to daily modal state
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [moveTaskTier, setMoveTaskTier] = useState<TaskTier>("C");
  const [moveTaskCategory, setMoveTaskCategory] = useState<Category>("LIFE");

  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsAdding(true);
    setIsLoading(true);
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
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create backlog task:", error);
    } finally {
      setIsLoading(false);
      setIsAdding(false);
    }
  };

  const handleMoveToDaily = async (taskId: string) => {
    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          type: "DAILY",
          scheduledDate: today.toISOString(),
          tier: moveTaskTier,
          category: moveTaskCategory,
        }),
      });
      setMovingTaskId(null);
      setMoveTaskTier("C");
      setMoveTaskCategory("LIFE");
      router.refresh();
    } catch (error) {
      console.error("Failed to move task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    setIsLoading(true);
    try {
      await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      await fetch("/api/tasks/uncomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to uncomplete task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-green-900/30 p-[0.3vw] bg-black/50 flex flex-col h-[calc(100vh-45vh)] min-h-[14vh] max-h-[40vh] lg:h-[calc(100vh-35vh)] lg:max-h-[60vh] relative">
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
            
            <div className="space-y-[0.5vh]">
              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.3vh] block font-mono uppercase">Task Tier</label>
                <select
                  value={moveTaskTier}
                  onChange={(e) => setMoveTaskTier(e.target.value as TaskTier)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                >
                  <option value="S">S - Critical (High XP)</option>
                  <option value="A">A - Important</option>
                  <option value="B">B - Maintenance</option>
                  <option value="C">C - Chores</option>
                </select>
              </div>

              <div>
                <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.3vh] block font-mono uppercase">Category</label>
                <select
                  value={moveTaskCategory}
                  onChange={(e) => setMoveTaskCategory(e.target.value as Category)}
                  className="w-full bg-black/70 border border-green-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-green-500 font-mono"
                >
                  <option value="DEV">DEV</option>
                  <option value="ACADEMICS">ACADEMICS</option>
                  <option value="HEALTH">HEALTH</option>
                  <option value="LIFE">LIFE</option>
                </select>
              </div>

              <div className="flex gap-[0.5vw] pt-[0.3vh]">
                <button
                  onClick={() => handleMoveToDaily(movingTaskId)}
                  className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-green-400 uppercase tracking-wider font-mono"
                >
                  → Move to Today
                </button>
                <button
                  onClick={() => {
                    setMovingTaskId(null);
                    setMoveTaskTier("C");
                    setMoveTaskCategory("LIFE");
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
