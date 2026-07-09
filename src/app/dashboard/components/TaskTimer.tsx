"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { HudButton, ModalTitle } from "../../components/ui";

interface TaskTimerProps {
  taskTitle: string;
  initialMinutes: number;
  /** True when the task has a time limit — finishing the countdown completes it. */
  hasAllocatedDuration: boolean;
  onClose: () => void;
  onTimerComplete?: () => void;
}

export default function TaskTimer({
  taskTitle,
  initialMinutes,
  hasAllocatedDuration,
  onClose,
  onTimerComplete,
}: TaskTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const completedRef = useRef(false);

  const initialSeconds = Math.max(1, initialMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const done = totalSeconds === 0;

  useEffect(() => {
    if (!running || totalSeconds <= 0) return;
    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (hasAllocatedDuration && onTimerComplete && !completedRef.current) {
            completedRef.current = true;
            setTimeout(onTimerComplete, 400);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, totalSeconds, hasAllocatedDuration, onTimerComplete]);

  const applyEdit = () => {
    const parts = editValue.split(":").map((p) => parseInt(p) || 0);
    let secs = 0;
    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
    else secs = parts[0] * 60;
    if (secs > 0) setTotalSeconds(Math.min(secs, 24 * 3600));
    setEditing(false);
  };

  const addMinutes = (m: number) => setTotalSeconds((prev) => Math.max(0, prev + m * 60));

  // Progress ring geometry
  const R = 88;
  const C = 2 * Math.PI * R;
  const progress = Math.max(0, Math.min(1, totalSeconds / initialSeconds));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="animate-rise glass r-xl shadow-[0_0_80px_var(--glow)] w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="min-w-0">
            <ModalTitle>Focus timer</ModalTitle>
            <p className="text-xs text-ink3 truncate">{taskTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 r-md text-ink3 hover:text-rosy hover:bg-rosy/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ring */}
        <div className="relative w-56 h-56 mx-auto my-4">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--acc)" />
                <stop offset="100%" stopColor="var(--acc2)" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={done ? "var(--rose)" : "url(#timerGrad)"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{
                transition: "stroke-dashoffset 1s linear",
                filter: `drop-shadow(0 0 8px var(--glow))`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {editing ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={applyEdit}
                onKeyDown={(e) => e.key === "Enter" && applyEdit()}
                placeholder="mm or hh:mm"
                className="w-32 chip !border-acc/50 r-md text-ink text-center text-xl font-mono py-1.5 focus:outline-none"
              />
            ) : (
              <button
                className={`font-display text-4xl font-extrabold tracking-wide font-mono ${
                  done ? "text-rosy animate-pulse" : "grad-text"
                }`}
                onClick={() => {
                  if (!running) {
                    setEditValue(`${hours ? hours + ":" : ""}${minutes}:${String(seconds).padStart(2, "0")}`);
                    setEditing(true);
                  }
                }}
                title={running ? undefined : "Click to edit"}
              >
                {hours > 0 && `${String(hours).padStart(2, "0")}:`}
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </button>
            )}
            {done ? (
              <p className="text-rosy text-xs font-semibold mt-2 animate-blink">time&apos;s up</p>
            ) : (
              !running && <p className="text-ink3 text-[10px] mt-2">tap time to edit</p>
            )}
          </div>
        </div>

        {/* Quick adjust */}
        <div className="flex justify-center gap-2 mb-4">
          {[-5, -1, +1, +5, +15].map((m) => (
            <HudButton
              key={m}
              variant={m < 0 ? "danger" : "ghost"}
              disabled={running}
              onClick={() => addMinutes(m)}
            >
              {m > 0 ? `+${m}` : m}m
            </HudButton>
          ))}
        </div>

        <div className="flex gap-2.5">
          {!running ? (
            <HudButton
              variant="primary"
              className="flex-1 py-3 text-sm"
              disabled={done || editing}
              onClick={() => setRunning(true)}
            >
              <Play className="w-4 h-4 inline -mt-0.5 mr-1.5" /> Start
            </HudButton>
          ) : (
            <HudButton variant="gold" className="flex-1 py-3 text-sm" onClick={() => setRunning(false)}>
              <Pause className="w-4 h-4 inline -mt-0.5 mr-1.5" /> Pause
            </HudButton>
          )}
          <HudButton
            variant="ghost"
            className="py-3 px-5"
            onClick={() => {
              setRunning(false);
              completedRef.current = false;
              setTotalSeconds(initialMinutes * 60);
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </HudButton>
        </div>

        {hasAllocatedDuration && (
          <p className="text-[11px] text-ink3 text-center mt-4">
            Finishing the countdown auto-completes the quest with the +25% time bonus.
          </p>
        )}
      </div>
    </div>
  );
}
