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

export function BattleDetail({ battle, members, tasks, scores, currentUserId }: Props) {
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine" | "opponent" | "pending">("mine");

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${battle.id}`
    : "";

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const me = sortedScores.find((s) => s.userId === currentUserId);
  const opponent = sortedScores.find((s) => s.userId !== currentUserId);

  const now = new Date();
  const end = new Date(battle.period_end);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const pendingApprovalTasks = tasks.filter(
    (t) => t.status === "proposed" && t.user_id !== currentUserId
  );
  const myTasks = tasks.filter((t) => t.user_id === currentUserId);
  const opponentTasks = tasks.filter((t) => t.user_id !== currentUserId);

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
    if (now > end) {
      alert("バトル期間が終了しています");
      return;
    }
    const proofText = prompt("何をしたか簡単に書いてください:");
    if (!proofText) return;

    const supabase = createClient();
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

  const meInitial = (me?.name ?? "自").charAt(0);
  const opponentInitial = (opponent?.name ?? "?").charAt(0);

  const renderTask = (task: Task, showComplete: boolean) => {
    const isDone = task.status === "completed";
    const isApproved = task.status === "approved";
    const isPending = task.status === "proposed";

    return (
      <div key={task.id} className="flex items-center gap-3 py-3.5 px-1 border-b border-border last:border-0">
        <div className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 flex-shrink-0 text-[0.7rem] ${
          isDone ? "bg-win border-win text-white" : isApproved ? "bg-primary-glow border-primary" : "border-border"
        }`}>
          {isDone && "✓"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[0.85rem] font-medium ${isDone ? "line-through opacity-50" : ""}`}>{task.title}</p>
          <p className="text-[0.7rem] text-muted mt-0.5">
            {categoryLabel[task.category] ?? task.category}
            {task.completed_at && ` ・ ${new Date(task.completed_at).toLocaleDateString("ja-JP")}完了`}
          </p>
        </div>
        {isDone && (
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium bg-[rgba(34,197,94,0.1)] text-win">完了</span>
        )}
        {isApproved && showComplete && (
          <button
            onClick={() => handleCompleteTask(task.id)}
            className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium bg-primary text-white transition-transform active:scale-95"
          >
            報告
          </button>
        )}
        {isApproved && !showComplete && (
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium bg-[rgba(234,179,8,0.1)] text-yellow-600">承認済</span>
        )}
        {isPending && (
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium bg-[rgba(234,179,8,0.1)] text-yellow-600">承認待ち</span>
        )}
      </div>
    );
  };

  return (
    <main className="flex flex-col max-w-lg mx-auto pb-24">
      {/* Nav */}
      <a href="/" className="flex items-center gap-2 px-5 py-3 text-[0.85rem] text-primary font-medium">
        ← バトル一覧
      </a>

      {/* Detail header */}
      <div className="text-center border-b border-border px-5 pb-4">
        <h1 className="text-lg font-semibold">{battle.title}</h1>
        <p className="text-[0.75rem] text-muted mt-1">
          {new Date(battle.period_start).toLocaleDateString("ja-JP")} 〜 {end.toLocaleDateString("ja-JP")} ・ 残り{daysLeft}日
        </p>
      </div>

      {/* Score hero */}
      <div className="flex items-center justify-center gap-6 py-6 px-5">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-1.5 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-base font-semibold text-white">
            {meInitial}
          </div>
          <p className="text-[0.75rem] text-muted mb-1">{me?.name ?? "自分"}</p>
          <p className="text-4xl font-extrabold tracking-tighter tabular-nums">{me?.score ?? 0}</p>
        </div>
        <span className="text-[0.85rem] text-muted font-bold">VS</span>
        {opponent ? (
          <div className="text-center">
            <div className="h-12 w-12 mx-auto mb-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base font-semibold text-white">
              {opponentInitial}
            </div>
            <p className="text-[0.75rem] text-muted mb-1">{opponent.name}</p>
            <p className="text-4xl font-extrabold tracking-tighter tabular-nums">{opponent.score}</p>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={copyInvite}
              className="h-12 w-12 mx-auto mb-1.5 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary text-lg"
            >
              +
            </button>
            <p className="text-[0.75rem] text-primary font-medium">
              {copied ? "コピー済み!" : "招待する"}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {(["mine", "opponent", "pending"] as const).map((tab) => {
          const labels = { mine: "自分のタスク", opponent: "相手のタスク", pending: `承認待ち${pendingApprovalTasks.length > 0 ? ` (${pendingApprovalTasks.length})` : ""}` };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-3 text-[0.8rem] font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "text-primary border-primary"
                  : "text-muted border-transparent"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-5">
        {activeTab === "mine" && (
          <>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">タスクを提案してバトルを始めよう</p>
            ) : (
              myTasks.map((t) => renderTask(t, true))
            )}
          </>
        )}
        {activeTab === "opponent" && (
          <>
            {opponentTasks.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">相手のタスクはまだありません</p>
            ) : (
              opponentTasks.map((t) => renderTask(t, false))
            )}
          </>
        )}
        {activeTab === "pending" && (
          <>
            {pendingApprovalTasks.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">承認待ちのタスクはありません</p>
            ) : (
              <div className="py-4">
                <TaskSwipeApproval tasks={pendingApprovalTasks} currentUserId={currentUserId} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <button
          onClick={() => setShowTaskForm(true)}
          className="w-full max-w-lg mx-auto block rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3.5 text-[0.9rem] font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
        >
          タスクを提案する
        </button>
      </div>

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
              className="mb-3 w-full rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="mb-4 w-full rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-foreground"
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
                className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-emerald-500 py-3 font-semibold text-white disabled:opacity-50"
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
