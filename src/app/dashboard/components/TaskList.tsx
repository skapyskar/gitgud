"use client";
import { completeTask } from "../../actions/completeTask";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TaskList({ tasks }: any) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setLoadingId(id);
    await completeTask(id);
    setLoadingId(null);
    router.refresh();
  };

  if (!tasks || tasks.length === 0) {
    return <div className="text-gray-600 italic text-sm p-4">No active processes found...</div>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t: any) => (
        <li 
          key={t.id} 
          className={`
            flex items-center justify-between p-3 border-l-2 transition-all
            ${t.isCompleted 
              ? "bg-green-900/10 border-green-700 opacity-50" 
              : "bg-[#111] border-gray-700 hover:border-green-500 hover:bg-[#151515]"
            }
          `}
        >
          <div className="flex items-center gap-3">
             <span className={`
               text-xs font-bold px-2 py-0.5 border
               ${t.tier === 'S' ? 'text-red-400 border-red-900 bg-red-900/20' : 
                 t.tier === 'A' ? 'text-orange-400 border-orange-900 bg-orange-900/20' : 
                 t.tier === 'B' ? 'text-yellow-400 border-yellow-900 bg-yellow-900/20' :
                 'text-gray-400 border-gray-800'}
             `}>
               {t.tier}
             </span>
             <span className={t.isCompleted ? "line-through text-gray-500" : "text-gray-200"}>
               {t.title}
             </span>
          </div>

          <div className="flex items-center gap-3">
            {/* XP Display */}
            <span className="text-xs font-mono text-green-700">
              [{t.finalPoints || t.basePoints || 0} XP]
            </span>

            {/* Complete Button */}
            {!t.isCompleted ? (
              <button 
                onClick={() => handleComplete(t.id)}
                disabled={loadingId === t.id}
                className="text-xs border border-green-800 text-green-600 px-3 py-1 hover:bg-green-500 hover:text-black transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingId === t.id ? "[PROCESSING...]" : "[Complete]"}
              </button>
            ) : (
              <span className="text-xs text-green-800 font-mono">[DONE]</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}