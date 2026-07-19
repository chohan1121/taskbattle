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
    return <div className="approve-empty">すべて確認しました ✓</div>;
  }

  const handleAction = async (approved: boolean) => {
    if (processing) return;
    setProcessing(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        status: approved ? "approved" : "rejected",
        approved_by: approved ? currentUserId : null,
      })
      .eq("id", currentTask.id)
      .eq("status", "proposed");

    setProcessing(false);

    if (error) {
      alert((approved ? "承認" : "却下") + "に失敗しました: " + error.message);
      setOffset(0);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setOffset(0);
    router.refresh();
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = 80;
    if (offset > threshold) handleAction(true);
    else if (offset < -threshold) handleAction(false);
    else setOffset(0);
  };

  const lean = offset > 40 ? "lean-approve" : offset < -40 ? "lean-reject" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        className={`approve-card ${lean}`}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; setDragging(true); }}
        onTouchMove={(e) => { if (dragging) setOffset(e.touches[0].clientX - startX.current); }}
        onTouchEnd={endDrag}
        onMouseDown={(e) => { startX.current = e.clientX; setDragging(true); }}
        onMouseMove={(e) => { if (dragging) setOffset(e.clientX - startX.current); }}
        onMouseUp={endDrag}
        onMouseLeave={() => { if (dragging) { setDragging(false); setOffset(0); } }}
        style={{
          transform: `translateX(${offset}px) rotate(${offset * 0.04}deg)`,
          transition: dragging ? "none" : "transform 0.3s, background-color 0.2s, border-color 0.2s",
        }}
      >
        <div className="approve-title">{currentTask.title}</div>
        <span className="approve-cat">{categoryLabel[currentTask.category] ?? currentTask.category}</span>
        <div className="approve-hint">
          <span className="h-reject">← 却下</span>
          <span className="h-approve">承認 →</span>
        </div>
      </div>

      <div className="approve-actions">
        <button className="btn-reject" onClick={() => handleAction(false)} disabled={processing}>✕ 却下</button>
        <button className="btn-approve" onClick={() => handleAction(true)} disabled={processing}>○ 承認</button>
      </div>

      <div className="approve-count">{currentIndex + 1} / {tasks.length}</div>
    </div>
  );
}
