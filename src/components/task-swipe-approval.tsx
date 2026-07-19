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
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);

  const currentTask = tasks[currentIndex];
  if (!currentTask) {
    return <p className="text-sm text-muted">すべて確認済み ✓</p>;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    setOffset(e.touches[0].clientX - startX.current);
  };

  const handleTouchEnd = async () => {
    setSwiping(false);
    const threshold = 100;

    if (Math.abs(offset) > threshold) {
      const approved = offset > 0;
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
    }

    setOffset(0);
    router.refresh();
  };

  const bgColor = offset > 50 ? "bg-win/10" : offset < -50 ? "bg-loss/10" : "bg-surface";

  return (
    <div className="relative">
      <div
        className={`rounded-[14px] p-6 text-center transition-colors ${bgColor} touch-none`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? "none" : "transform 0.3s" }}
      >
        <p className="text-lg font-semibold">{currentTask.title}</p>
        <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          {currentTask.category}
        </span>
        <div className="mt-4 flex justify-between text-xs text-muted">
          <span>← 却下</span>
          <span>承認 →</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        {currentIndex + 1} / {tasks.length}
      </p>
    </div>
  );
}
