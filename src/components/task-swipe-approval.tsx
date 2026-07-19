"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Task = {
  id: string;
  title: string;
  category: string;
  user_id: string;
};

const categoryLabel: Record<string, string> = {
  coding: "コーディング",
  study: "勉強",
  exercise: "運動",
  other: "その他",
};

export function TaskSwipeApproval({
  tasks,
  currentUserId,
}: {
  tasks: Task[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const startX = useRef(0);

  const currentTask = tasks[currentIndex];
  if (!currentTask) {
    return (
      <div className="rounded-[14px] bg-surface p-4 text-center">
        <p className="text-sm text-muted">すべて確認済み ✓</p>
      </div>
    );
  }

  const handleAction = async (approved: boolean) => {
    if (processing) return;
    setProcessing(true);

    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({
        status: approved ? "approved" : "rejected",
        approved_by: approved ? currentUserId : null,
      })
      .eq("id", currentTask.id)
      .eq("status", "proposed");

    setCurrentIndex((i) => i + 1);
    setOffset(0);
    setProcessing(false);
    router.refresh();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    setOffset(e.touches[0].clientX - startX.current);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    const threshold = 80;
    if (offset > threshold) {
      handleAction(true);
    } else if (offset < -threshold) {
      handleAction(false);
    } else {
      setOffset(0);
    }
  };

  // Mouse events (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset(e.clientX - startX.current);
  };

  const handleMouseUp = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = 80;
    if (offset > threshold) {
      handleAction(true);
    } else if (offset < -threshold) {
      handleAction(false);
    } else {
      setOffset(0);
    }
  };

  const bgColor = offset > 40 ? "bg-emerald-50 border-emerald-300" : offset < -40 ? "bg-red-50 border-red-300" : "bg-white border-border";

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`select-none cursor-grab rounded-[14px] border-2 p-6 text-center transition-colors ${bgColor} touch-none`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (dragging) { setDragging(false); setOffset(0); } }}
        style={{ transform: `translateX(${offset}px) rotate(${offset * 0.05}deg)`, transition: dragging ? "none" : "transform 0.3s, background-color 0.2s" }}
      >
        <p className="text-lg font-semibold text-foreground">{currentTask.title}</p>
        <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {categoryLabel[currentTask.category] ?? currentTask.category}
        </span>
        <div className="mt-4 flex justify-between text-xs text-muted">
          <span className="text-loss font-medium">← 却下</span>
          <span className="text-win font-medium">承認 →</span>
        </div>
      </div>

      {/* Fallback buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleAction(false)}
          disabled={processing}
          className="flex-1 rounded-[14px] border-2 border-loss/30 py-2 text-sm font-semibold text-loss transition-colors hover:bg-loss/5 active:scale-95 disabled:opacity-50"
        >
          ✕ 却下
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={processing}
          className="flex-1 rounded-[14px] border-2 border-win/30 py-2 text-sm font-semibold text-win transition-colors hover:bg-win/5 active:scale-95 disabled:opacity-50"
        >
          ○ 承認
        </button>
      </div>

      <p className="text-center text-xs text-muted">
        {currentIndex + 1} / {tasks.length}
      </p>
    </div>
  );
}
