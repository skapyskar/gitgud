"use client";

import { useState } from "react";
import { Task } from "../../../../prisma/generated/client";

interface BacklogPanelProps {
  tasks: Task[];
  userId: string;
}

export default function BacklogPanel({ tasks, userId }: BacklogPanelProps) {
  const [newTask, setNewTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsAdding(true);
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
        window.location.reload(); // Temporary - use revalidation in production
      }
    } catch (error) {
      console.error("Failed to create backlog task:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleMoveToDaily = async (taskId: string) => {
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
        }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to move task:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
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
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
        <h3 className="text-xl font-bold text-green-500 uppercase tracking-wider">
          &gt;&gt; The_Dump
        </h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-4 font-mono">
        // Backlog tasks - Schedule when ready
      </p>

      {/* Add New Backlog Task */}
      <form onSubmit={handleAddTask} className="mb-4 space-y-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New backlog task..."
          className="w-full bg-black/70 border border-green-900/50 px-3 py-2 text-sm text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono"
          disabled={isAdding}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-black/70 border border-green-900/50 px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-green-500 font-mono"
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
        {tasks.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8 font-mono">
            [EMPTY_BACKLOG]
            <br />
            No pending tasks
          </div>
        ) : (
          tasks.map((task) => (
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
                  onClick={() => handleMoveToDaily(task.id)}
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
      </div>
    </div>
  );
}
