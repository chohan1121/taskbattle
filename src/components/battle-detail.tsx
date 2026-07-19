"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TaskSwipeApproval } from "./task-swipe-approval";
import { VictoryCard } from "./victory-card";

type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };
type Task = { id: string; battle_id: string; user_id: string; title: string; category: string; status: string; completed_at: string | null; proof_text: string | null };
type Score = { userId: string; name: string; avatarUrl: string | null; score: number };
type Member = { user_id: string; role: string; name: string; avatarUrl: string | null };

type Props = {
  battle: Battle;
  members: Member[];
  tasks: Task[];
  scores: Score[];
  currentUserId: string;
};

const catLabel: Record<string, string> = { coding: "コーディング", study: "勉強", exercise: "運動", other: "その他" };

export function BattleDetail({ battle, members, tasks, scores, currentUserId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"mine" | "opponent" | "pending">("mine");
  const [showForm, setShowForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCat, setTaskCat] = useState("other");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const me = scores.find((s) => s.userId === currentUserId);
  const opponent = scores.find((s) => s.userId !== currentUserId);

  const now = new Date();
  const end = new Date(battle.period_end);
  const start = new Date(battle.period_start);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const pendingTasks = tasks.filter((t) => t.status === "proposed" && t.user_id !== currentUserId);
  const myTasks = tasks.filter((t) => t.user_id === currentUserId);
  const opponentTasks = tasks.filter((t) => t.user_id !== currentUserId);

  if (battle.status === "completed") {
    return <VictoryCard winner={sortedScores[0]} scores={sortedScores} battleTitle={battle.title} />;
  }

  const meInitial = (me?.name ?? "自").charAt(0);
  const oppInitial = (opponent?.name ?? "?").charAt(0);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${battle.id}` : "";

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = async (taskId: string) => {
    if (now > end) { alert("バトル期間が終了しています"); return; }
    const proof = prompt("何をしたか簡単に書いてください:");
    if (!proof) return;
    const supabase = createClient();
    await supabase.from("tasks").update({ status: "completed", completed_at: now.toISOString(), proof_text: proof }).eq("id", taskId).eq("status", "approved");
    router.refresh();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("tasks").insert({ battle_id: battle.id, user_id: currentUserId, title: taskTitle.trim(), category: taskCat });
    setTaskTitle(""); setShowForm(false); setLoading(false);
    router.refresh();
  };

  const renderTask = (task: Task, canComplete: boolean) => {
    const done = task.status === "completed";
    const approved = task.status === "approved";
    const proposed = task.status === "proposed";

    return (
      <div key={task.id} className="task-item">
        <div className={`task-check ${done ? "task-check-done" : approved ? "task-check-pending" : ""}`}>
          {done && "✓"}
        </div>
        <div className="task-info">
          <div className="task-title" style={done ? { textDecoration: "line-through", opacity: 0.5 } : {}}>{task.title}</div>
          <div className="task-category">
            {catLabel[task.category] ?? task.category}
            {task.completed_at && ` ・ ${new Date(task.completed_at).toLocaleDateString("ja-JP")}完了`}
          </div>
        </div>
        {done && <span className="task-badge badge-done">完了</span>}
        {approved && canComplete && <button className="badge-report" onClick={() => handleComplete(task.id)}>完了報告</button>}
        {approved && !canComplete && <span className="task-badge badge-approved">承認済</span>}
        {proposed && <span className="task-badge badge-pending">承認待ち</span>}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      <a href="/" className="nav-back">← バトル一覧</a>

      <div className="detail-header">
        <div className="detail-title">{battle.title}</div>
        <div className="detail-period">
          {start.toLocaleDateString("ja-JP")} 〜 {end.toLocaleDateString("ja-JP")} ・ 残り{daysLeft}日
        </div>
      </div>

      {/* Score hero */}
      <div className="score-hero">
        <div className="score-hero-player">
          <div className="score-hero-avatar" style={{ background: "linear-gradient(135deg, var(--primary), #34d399)" }}>{meInitial}</div>
          <div className="score-hero-name">{me?.name ?? "自分"}</div>
          <div className="score-hero-num">{me?.score ?? 0}</div>
        </div>
        <div className="score-hero-vs">VS</div>
        {opponent ? (
          <div className="score-hero-player">
            <div className="score-hero-avatar" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>{oppInitial}</div>
            <div className="score-hero-name">{opponent.name}</div>
            <div className="score-hero-num">{opponent.score}</div>
          </div>
        ) : (
          <div className="score-hero-player" style={{ cursor: "pointer" }} onClick={copyInvite}>
            <div className="score-hero-avatar" style={{ background: "var(--surface-2)", border: "2px dashed var(--primary)", color: "var(--primary)", fontSize: "1.2rem" }}>+</div>
            <div className="score-hero-name" style={{ color: "var(--primary)" }}>{copied ? "コピー済み!" : "招待する"}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === "mine" ? "active" : ""}`} onClick={() => setActiveTab("mine")}>自分のタスク</button>
        <button className={`tab ${activeTab === "opponent" ? "active" : ""}`} onClick={() => setActiveTab("opponent")}>相手のタスク</button>
        <button className={`tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          承認待ち{pendingTasks.length > 0 && ` (${pendingTasks.length})`}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "mine" && (
        myTasks.length === 0
          ? <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>タスクを提案してバトルを始めよう</div>
          : myTasks.map((t) => renderTask(t, true))
      )}
      {activeTab === "opponent" && (
        opponentTasks.length === 0
          ? <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>相手のタスクはまだありません</div>
          : opponentTasks.map((t) => renderTask(t, false))
      )}
      {activeTab === "pending" && (
        pendingTasks.length === 0
          ? <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>承認待ちのタスクはありません</div>
          : <div style={{ padding: "16px 20px" }}><TaskSwipeApproval tasks={pendingTasks} currentUserId={currentUserId} /></div>
      )}

      {/* Bottom action */}
      <div className="bottom-action">
        <button className="btn-primary" onClick={() => setShowForm(true)}>タスクを提案する</button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleAddTask}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>タスクを提案</h3>
            <input className="modal-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="タスク名" required autoFocus style={{ marginBottom: 12 }} />
            <select className="modal-input" value={taskCat} onChange={(e) => setTaskCat(e.target.value)} style={{ marginBottom: 16 }}>
              <option value="coding">コーディング</option>
              <option value="study">勉強</option>
              <option value="exercise">運動</option>
              <option value="other">その他</option>
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "white", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>キャンセル</button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1 }}>{loading ? "..." : "提案する"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
