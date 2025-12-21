"use client";
import { createTask } from "../../actions/createTask";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TaskForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  return (
    <form 
      action={async (formData) => {
        setIsPending(true);
        await createTask(formData);
        formRef.current?.reset();
        setIsPending(false);
        router.refresh(); // Refresh UI to show new task
      }} 
      ref={formRef}
      className="flex flex-col gap-4"
    >
      <div className="flex gap-2">
        <span className="text-green-500 pt-2">$</span>
        <input 
          name="title" 
          placeholder="Enter task objective..." 
          required 
          disabled={isPending}
          className="flex-1 bg-transparent border-b border-gray-700 text-white p-2 focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-700 disabled:opacity-50"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col flex-1">
          <label className="text-[10px] text-gray-500 mb-1">PRIORITY_TIER</label>
          <select 
            name="tier" 
            disabled={isPending}
            className="bg-[#050505] border border-gray-700 text-gray-300 text-sm p-2 focus:border-green-500 focus:outline-none disabled:opacity-50"
          >
            <option value="C">Tier C (Low)</option>
            <option value="B">Tier B (Mid)</option>
            <option value="A">Tier A (High)</option>
            <option value="S">Tier S (Critical)</option>
          </select>
        </div>

        <div className="flex flex-col flex-1">
          <label className="text-[10px] text-gray-500 mb-1">DEADLINE</label>
          <input 
            type="date" 
            name="plannedDate" 
            required 
            disabled={isPending}
            className="bg-[#050505] border border-gray-700 text-gray-300 text-sm p-2 focus:border-green-500 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      <button 
        disabled={isPending}
        className="bg-green-700 hover:bg-green-600 text-black font-bold py-2 mt-2 uppercase text-sm tracking-widest transition-all hover:shadow-[0_0_10px_rgba(0,255,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "PROCESSING..." : "Execute Command"}
      </button>
    </form>
  );
}