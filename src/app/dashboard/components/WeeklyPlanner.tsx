"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskTier, Category } from "../../../../prisma/generated/client";

type WeeklyTask = Task & { repeatDays?: string | null };

interface WeeklyPlannerProps {
  templates: WeeklyTask[];
  userId: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyPlanner({ templates, userId }: WeeklyPlannerProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [tier, setTier] = useState<TaskTier>("C");
  const [category, setCategory] = useState<Category>("LIFE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || selectedDays.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          type: "WEEKLY",
          tier,
          category,
          repeatDays: selectedDays.sort().join(","),
        }),
      });

      if (res.ok) {
        setNewTaskTitle("");
        setSelectedDays([]);
        setTier("C");
        setCategory("LIFE");
        setIsCreating(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create weekly task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (taskId: string) => {
    setIsLoading(true);
    try {
      await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-green-900/30 p-[1vw] bg-black/50 flex flex-col h-[calc(100vh-25vh)] min-h-[500px] max-h-[70vh] relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-green-400 font-mono text-sm animate-pulse">LOADING...</div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
          <h3 className="text-xl font-bold text-green-500 uppercase tracking-wider">
            &gt;&gt; Weekly_Templates
          </h3>
        </div>
        
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 px-3 py-1 text-purple-400 uppercase tracking-wider font-mono"
          >
            + New Template
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4 font-mono">
        Preplanned Tasks
      </p>

      {/* Create New Template Form */}
      {isCreating && (
        <form onSubmit={handleCreateTemplate} className="mb-4 p-3 bg-purple-900/10 border border-purple-700/30">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Weekly task name..."
            className="w-full bg-black/70 border border-purple-900/50 px-3 py-2 text-sm text-green-400 placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono mb-3"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-mono">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TaskTier)}
                className="w-full bg-black/70 border border-purple-900/50 px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-purple-500 font-mono"
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
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-black/70 border border-purple-900/50 px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="DEV">DEV</option>
                <option value="ACADEMICS">ACADEMICS</option>
                <option value="HEALTH">HEALTH</option>
                <option value="LIFE">LIFE</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 font-mono">Select Days:</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-3 py-1 text-xs font-mono border transition-colors ${
                    selectedDays.includes(index)
                      ? "bg-purple-600/50 border-purple-400 text-purple-200"
                      : "bg-black/50 border-purple-900/30 text-gray-500 hover:border-purple-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !newTaskTitle.trim() || selectedDays.length === 0}
              className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 px-3 py-2 text-xs text-purple-400 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              {isSubmitting ? "Creating..." : "Create Template"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTaskTitle("");
                setSelectedDays([]);
                setTier("C");
                setCategory("LIFE");
              }}
              className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-400 uppercase font-mono"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Existing Templates */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {templates.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8 font-mono">
            [NO_WEEKLY_TEMPLATES]
            <br />
            Create recurring tasks
          </div>
        ) : (
          templates.map((template) => {
            const days = template.repeatDays?.split(",").map(Number) || [];
            
            return (
              <div
                key={template.id}
                className="bg-black/70 border border-purple-700/30 p-3 hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 font-bold border font-mono ${
                        template.tier === 'S' ? 'bg-red-900/30 border-red-500 text-red-400' :
                        template.tier === 'A' ? 'bg-orange-900/30 border-orange-500 text-orange-400' :
                        template.tier === 'B' ? 'bg-blue-900/30 border-blue-500 text-blue-400' :
                        'bg-gray-900/30 border-gray-500 text-gray-400'
                      }`}>{template.tier}</span>
                      <span className="text-[10px] text-gray-500 font-mono">[{template.category}]</span>
                    </div>
                    <h4 className="text-sm text-green-400 font-mono">{template.title}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-xs text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex gap-1 flex-wrap mt-2">
                  {DAYS.map((day, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-0.5 border font-mono ${
                        days.includes(index)
                          ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                          : "bg-black/50 border-gray-800 text-gray-700"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {days.includes(new Date().getDay()) && (
                  <div className="mt-2 text-xs text-green-500 font-mono">
                    ✓ Active today (+10 bonus XP if completed)
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
