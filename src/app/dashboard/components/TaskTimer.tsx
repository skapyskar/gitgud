"use client";

import React, { useState, useEffect, useRef } from "react";

interface TaskTimerProps {
    taskId: string;
    initialMinutes: number; // Default duration in minutes (from task.allocatedDuration or 60)
    onClose: () => void;
}

export default function TaskTimer({ taskId, initialMinutes, onClose }: TaskTimerProps) {
    // Convert initial minutes to seconds
    const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Editable time inputs
    const [editHours, setEditHours] = useState(Math.floor(initialMinutes / 60));
    const [editMinutes, setEditMinutes] = useState(initialMinutes % 60);
    const [editSeconds, setEditSeconds] = useState(0);

    // Format time display
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Timer logic
    useEffect(() => {
        if (isRunning && totalSeconds > 0) {
            intervalRef.current = setInterval(() => {
                setTotalSeconds((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        // Optional: play notification sound or show alert
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, totalSeconds]);

    // Update edit fields when timer changes (for display sync)
    useEffect(() => {
        if (!isEditing) {
            setEditHours(hours);
            setEditMinutes(minutes);
            setEditSeconds(seconds);
        }
    }, [hours, minutes, seconds, isEditing]);

    const handleStart = () => {
        if (totalSeconds > 0) {
            setIsRunning(true);
            setIsEditing(false);
        }
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTotalSeconds(initialMinutes * 60);
    };

    const handleApplyEdit = () => {
        const newTotal = (editHours * 3600) + (editMinutes * 60) + editSeconds;
        setTotalSeconds(Math.max(0, newTotal));
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditHours(hours);
        setEditMinutes(minutes);
        setEditSeconds(seconds);
        setIsEditing(false);
    };

    // Quick time adjustments
    const addTime = (addMinutes: number) => {
        setTotalSeconds((prev) => Math.max(0, prev + addMinutes * 60));
    };

    const isComplete = totalSeconds === 0;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-black border-2 border-green-500 p-6 max-w-md w-full shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl text-green-400 font-mono uppercase tracking-wider">
                        ⏱ Task Timer
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-500 transition-colors text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Timer Display */}
                <div className={`text-center py-6 mb-6 border ${isComplete ? 'border-red-500 bg-red-900/20' : 'border-green-900/50 bg-green-900/10'}`}>
                    {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="number"
                                value={editHours}
                                onChange={(e) => setEditHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                className="w-16 bg-black border border-green-500 text-green-400 text-2xl font-mono text-center py-2"
                                min="0"
                                max="23"
                            />
                            <span className="text-green-400 text-2xl">:</span>
                            <input
                                type="number"
                                value={editMinutes}
                                onChange={(e) => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                className="w-16 bg-black border border-green-500 text-green-400 text-2xl font-mono text-center py-2"
                                min="0"
                                max="59"
                            />
                            <span className="text-green-400 text-2xl">:</span>
                            <input
                                type="number"
                                value={editSeconds}
                                onChange={(e) => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                className="w-16 bg-black border border-green-500 text-green-400 text-2xl font-mono text-center py-2"
                                min="0"
                                max="59"
                            />
                        </div>
                    ) : (
                        <div
                            className={`text-5xl font-mono tracking-wider cursor-pointer hover:text-green-300 transition-colors ${isComplete ? 'text-red-400 animate-pulse' : 'text-green-400'}`}
                            onClick={() => !isRunning && setIsEditing(true)}
                            title="Click to edit time"
                        >
                            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                        </div>
                    )}

                    {isComplete && (
                        <div className="text-red-400 font-mono text-sm mt-2 animate-pulse">
                            ⚠️ TIME'S UP!
                        </div>
                    )}

                    {!isEditing && !isRunning && !isComplete && (
                        <div className="text-gray-600 font-mono text-xs mt-2">
                            Click time to edit
                        </div>
                    )}
                </div>

                {/* Edit Confirmation Buttons */}
                {isEditing && (
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={handleApplyEdit}
                            className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 px-4 py-2 text-green-400 font-mono uppercase text-sm"
                        >
                            ✓ Apply
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-700 px-4 py-2 text-gray-400 font-mono uppercase text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Quick Time Adjustments */}
                {!isEditing && (
                    <div className="flex gap-2 mb-4 justify-center">
                        <button
                            onClick={() => addTime(-5)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 font-mono text-xs disabled:opacity-50"
                        >
                            -5m
                        </button>
                        <button
                            onClick={() => addTime(-1)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 font-mono text-xs disabled:opacity-50"
                        >
                            -1m
                        </button>
                        <button
                            onClick={() => addTime(1)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 text-green-400 font-mono text-xs disabled:opacity-50"
                        >
                            +1m
                        </button>
                        <button
                            onClick={() => addTime(5)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 text-green-400 font-mono text-xs disabled:opacity-50"
                        >
                            +5m
                        </button>
                        <button
                            onClick={() => addTime(15)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 text-green-400 font-mono text-xs disabled:opacity-50"
                        >
                            +15m
                        </button>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-3">
                    {!isRunning ? (
                        <button
                            onClick={handleStart}
                            disabled={isComplete || isEditing}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold py-3 font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ▶ START
                        </button>
                    ) : (
                        <button
                            onClick={handlePause}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 font-mono uppercase tracking-wider"
                        >
                            ⏸ PAUSE
                        </button>
                    )}
                    <button
                        onClick={handleReset}
                        className="px-6 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 font-mono uppercase py-3"
                    >
                        ↺ RESET
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="h-2 bg-gray-800 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${isComplete ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{
                                width: `${Math.max(0, (totalSeconds / (initialMinutes * 60)) * 100)}%`,
                            }}
                        />
                    </div>
                    <div className="text-xs text-gray-600 font-mono mt-1 text-center">
                        {Math.round((totalSeconds / (initialMinutes * 60)) * 100)}% remaining
                    </div>
                </div>
            </div>
        </div>
    );
}
