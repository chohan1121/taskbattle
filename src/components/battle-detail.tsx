"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TaskSwipeApproval } from "./task-swipe-approval";
import { VictoryCard } from "./victory-card";

type Battle = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
};

type Task = {
  id: string;
  battle_id: string;
  user_id: string;
  title: string;
  category: string;
  status: string;
  completed_at: string | null;
  proof_text: string | null;
};

type Score = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
};

type Member = {
  user_id: string;
  role: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  battle: Battle;
  members: Member[];
  tasks: Task[];
  scores: Score[];
  currentUserId: string;
};

const categoryLabel: Record<string, string> = {
  coding: "コーディング",
  study: "勉強",
  exercise: "運動",
  other: "その他",
};

const statusLabel: Record<string, string> = {
  preparing: "準備中",
  active: "進行中",
  completed: "終了",
};

export function BattleDetail({ battle, members, tasks, scores, currentUserId }: Props) {
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${battle.id}`
    : "";

  const pendingApprovalTasks = tasks.filter(
    (t) => t.status === "proposed" && t.user_id !== currentUserId
  );

  const myProposedTasks = tasks.filter(
    (t) => t.user_id === currentUserId && t.status === "proposed"
  );

  const myApprovedTasks = tasks.filter(
    (t) => t.user_id === currentUserId && t.status === "approved"
  );

  const myCompletedTasks = tasks.filter(
    (t) => t.user_id === currentUserId && t.status === "completed"
  );

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  if (battle.status === "completed") {
    const winner = sortedScores[0];
    return <VictoryCard winner={winner} scores={sortedScores} battleTitle={battle.title} />;
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.from("tasks").insert({
      battle_id: battle.id,
      user_id: currentUserId,
      title: taskTitle.trim(),
      category: taskCategory,
    });

    setTaskTitle("");
    setShowTaskForm(false);
    setLoading(false);
    router.refresh();
  };

  const handleCompleteTask = async (taskId: string) => {
    const supabase = createClient();
    const now = new Date();
    const periodEnd = new Date(battle.period_end);

    if (now > periodEnd) {
      alert("バトル期間が終了しています");
      return;
    }

    const proofText = prompt("何をしたか簡単に書いてください:");
    if (!proofText) return;

    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: now.toISOString(), proof_text: proofText })
      .eq("id", taskId)
      .eq("status", "approved");

    router.refresh();
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex flex-col gap-5 p-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <a href="/" className="text-sm text-primary font-medium">← バトル一覧</a>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-foreground">{battle.title}</h1>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {statusLabel[battle.status] ?? battle.status}
          </span>
        </div>
        <p className="text-xs text-muted">
          {new Date(battle.period_end).toLocaleDateString("ja-JP")} まで
        </p>
      </header>

      {/* Members */}
      <section className="rounded-[14px] bg-white border border-border p-4">
        <h2 className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">メンバー</h2>
        <div className="flex gap-3">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {m.name.charAt(0)}
              </div>
              <span className="text-sm font-medium">{m.name}</span>
            </div>
          ))}
          {members.length < 2 && (
            <button onClick={copyInvite} className="flex items-center gap-1 text-sm text-primary font-medium">
              {copied ? "✓ コピー済み" : "+ 招待"}
            </button>
          )}
        </div>
      </section>

      {/* Score board */}
      <section className="rounded-[14px] bg-white border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">スコアボード</h2>
        <div className="flex flex-col gap-3">
          {sortedScores.map((s, i) => (
            <div key={s.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-primary text-white" : "bg-surface text-muted"}`}>
                  {i + 1}
                </span>
                <span className="font-medium text-foreground">{s.name}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{s.score}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pending approvals */}
      {pendingApprovalTasks.length > 0 && (
        <section className="rounded-[14px] bg-white border border-border p-4">
          <h2 className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">
            承認待ち ({pendingApprovalTasks.length})
          </h2>
          <TaskSwipeApproval
            tasks={pendingApprovalTasks}
            currentUserId={currentUserId}
          />
        </section>
      )}

      {/* My tasks section */}
      <section className="rounded-[14px] bg-white border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">自分のタスク</h2>
          <button
            onClick={() => setShowTaskForm(true)}
            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition-transform active:scale-95"
          >
            + 提案する
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {myProposedTasks.length === 0 && myApprovedTasks.length === 0 && myCompletedTasks.length === 0 && (
            <p className="text-sm text-muted py-2">タスクを提案してバトルを始めよう</p>
          )}

          {myApprovedTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-[12px] bg-surface p-3">
              <div>
                <p className="font-medium text-foreground">{task.title}</p>
                <span className="text-xs text-muted">{categoryLabel[task.category] ?? task.category}</span>
              </div>
              <button
                onClick={() => handleCompleteTask(task.id)}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-transform active:scale-95"
              >
                完了報告
              </button>
            </div>
          ))}

          {myProposedTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-[12px] bg-yellow-50 border border-yellow-200 p-3">
              <div>
                <p className="font-medium text-foreground">{task.title}</p>
                <span className="text-xs text-muted">{categoryLabel[task.category] ?? task.category}</span>
              </div>
              <span className="text-xs font-medium text-yellow-600">承認待ち</span>
            </div>
          ))}

          {myCompletedTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-[12px] bg-emerald-50 border border-emerald-200 p-3">
              <div>
                <p className="font-medium text-foreground line-through opacity-60">{task.title}</p>
                <span className="text-xs text-muted">{categoryLabel[task.category] ?? task.category}</span>
              </div>
              <span className="text-xs font-medium text-emerald-600">完了 ✓</span>
            </div>
          ))}
        </div>
      </section>

      {/* Task form modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowTaskForm(false)}>
          <form
            onSubmit={handleAddTask}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[20px] bg-white p-6 shadow-xl"
          >
            <h3 className="mb-4 text-lg font-bold text-foreground">タスクを提案</h3>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="タスク名"
              className="mb-3 w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="mb-4 w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-foreground"
            >
              <option value="coding">コーディング</option>
              <option value="study">勉強</option>
              <option value="exercise">運動</option>
              <option value="other">その他</option>
            </select>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTaskForm(false)}
                className="flex-1 rounded-[14px] border border-border py-3 font-medium text-foreground"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-[14px] bg-primary py-3 font-semibold text-white disabled:opacity-50"
              >
                提案する
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
