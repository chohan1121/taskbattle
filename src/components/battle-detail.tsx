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

type Props = {
  battle: Battle;
  members: Array<{ user_id: string; role: string; users: unknown }>;
  tasks: Task[];
  scores: Score[];
  currentUserId: string;
};

export function BattleDetail({ battle, members, tasks, scores, currentUserId }: Props) {
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState<string | null>(null);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${battle.id}`
    : "";

  const pendingApprovalTasks = tasks.filter(
    (t) => t.status === "proposed" && t.user_id !== currentUserId
  );

  const myTasks = tasks.filter(
    (t) => t.user_id === currentUserId && t.status === "approved"
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

    setScoreAnimation(taskId);
    setTimeout(() => setScoreAnimation(null), 1000);
    router.refresh();
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    alert("招待リンクをコピーしました！");
  };

  return (
    <main className="flex flex-col gap-6 p-6 pb-24">
      <header>
        <a href="/" className="text-sm text-muted">← 戻る</a>
        <h1 className="mt-2 text-2xl font-bold">{battle.title}</h1>
        <p className="text-xs text-muted">
          {new Date(battle.period_end).toLocaleDateString("ja-JP")} まで
        </p>
      </header>

      {/* Score board */}
      <section className="rounded-[14px] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted">スコア</h2>
        <div className="flex flex-col gap-2">
          {sortedScores.map((s, i) => (
            <div key={s.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{i + 1}</span>
                <span className="font-medium">{s.name}</span>
              </div>
              <span className={`text-xl font-bold ${scoreAnimation ? "animate-bounce" : ""}`}>
                {s.score}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Invite */}
      {members.length < 2 && (
        <button
          onClick={copyInvite}
          className="rounded-[14px] border-2 border-dashed border-primary/30 p-4 text-center text-sm text-primary transition-colors hover:bg-primary/5"
        >
          🔗 招待リンクをコピー
        </button>
      )}

      {/* Pending approvals (swipe UI) */}
      {pendingApprovalTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">承認待ちタスク</h2>
          <TaskSwipeApproval
            tasks={pendingApprovalTasks}
            currentUserId={currentUserId}
          />
        </section>
      )}

      {/* My approved tasks */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">自分のタスク</h2>
          <button
            onClick={() => setShowTaskForm(true)}
            className="text-sm font-medium text-primary"
          >
            + 追加
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {myTasks.length === 0 && (
            <p className="text-sm text-muted">承認済みのタスクはまだありません</p>
          )}
          {myTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-[14px] bg-surface p-3"
            >
              <div>
                <p className="font-medium">{task.title}</p>
                <span className="text-xs text-muted">{task.category}</span>
              </div>
              <button
                onClick={() => handleCompleteTask(task.id)}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition-transform active:scale-95"
              >
                完了
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Task form modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
          <form
            onSubmit={handleAddTask}
            className="w-full max-w-md rounded-t-[20px] bg-white p-6 shadow-xl"
          >
            <h3 className="mb-4 text-lg font-bold">タスクを提案</h3>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="タスク名"
              className="mb-3 w-full rounded-[14px] border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="mb-4 w-full rounded-[14px] border border-border bg-surface px-4 py-3"
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
                className="flex-1 rounded-[14px] border border-border py-3 font-medium"
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
