"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TaskSwipeApproval } from "./task-swipe-approval";
import { VictoryCard } from "./victory-card";

type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };
type Task = { id: string; battle_id: string; user_id: string; title: string; category: string; status: string; completed_at: string | null; proof_text: string | null };
type Score = { userId: string; name: string; avatarUrl: string | null; score: number };
type Member = { user_id: string; role: string; name: string; avatarUrl: string | null; isReady: boolean };

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
  const [readyLoading, setReadyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const me = scores.find((s) => s.userId === currentUserId);
  const opponent = scores.find((s) => s.userId !== currentUserId);

  const now = new Date();
  const end = new Date(battle.period_end);
  const start = new Date(battle.period_start);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const isActive = battle.status === "active";
  const isPreparing = battle.status === "preparing";

  const bothJoined = members.length >= 2;
  const myMember = members.find((m) => m.user_id === currentUserId);
  const oppMember = members.find((m) => m.user_id !== currentUserId);
  const myReady = !!myMember?.isReady;
  const oppReady = !!oppMember?.isReady;

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

  const handleReady = async () => {
    setReadyLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("ready_up", { p_battle_id: battle.id });
    setReadyLoading(false);
    if (error) { alert("バトル開始に失敗しました: " + error.message); return; }
    router.refresh();
  };

  const handleComplete = async (taskId: string) => {
    if (!isActive) { alert("バトルがまだ開始されていません"); return; }
    if (now > end) { alert("バトル期間が終了しています"); return; }
    const proof = prompt("何をしたか簡単に書いてください:");
    if (!proof) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(), proof_text: proof })
      .eq("id", taskId)
      .eq("status", "approved");
    if (error) { alert("完了報告に失敗しました: " + error.message); return; }
    router.refresh();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .insert({ battle_id: battle.id, user_id: currentUserId, title: taskTitle.trim(), category: taskCat });
    setLoading(false);
    if (error) { alert("タスクの提案に失敗しました: " + error.message); return; }
    setTaskTitle(""); setShowForm(false);
    router.refresh();
  };

  const renderTask = (task: Task, isMine: boolean) => {
    const done = task.status === "completed";
    const approved = task.status === "approved";
    const proposed = task.status === "proposed";
    const rejected = task.status === "rejected";
    const canReport = isMine && isActive;

    return (
      <div key={task.id} className="task-item" style={rejected ? { opacity: 0.55 } : {}}>
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
        {approved && canReport && <button className="badge-report" onClick={() => handleComplete(task.id)}>完了報告</button>}
        {approved && !canReport && <span className="task-badge badge-approved">承認済</span>}
        {proposed && <span className="task-badge badge-pending">承認待ち</span>}
        {rejected && <span className="task-badge badge-rejected">却下</span>}
      </div>
    );
  };

  return (
    <div className="app-shell" style={{ paddingBottom: 80 }}>
      <a href="/" className="nav-back">← バトル一覧</a>

      <div className="detail-header">
        <div className="detail-title">{battle.title}</div>
        <div className="detail-period">
          {isActive
            ? `${start.toLocaleDateString("ja-JP")} 〜 ${end.toLocaleDateString("ja-JP")} ・ 残り${daysLeft}日`
            : `開始待ち ・ 期間 ${durationDays}日間`}
        </div>
      </div>

      {isActive && (
        <div className="status-banner active">⚔️ バトル中 ・ 残り{daysLeft}日</div>
      )}

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

      {/* Ready-up panel (preparing only) */}
      {isPreparing && (
        <div className="ready-panel">
          {!bothJoined ? (
            <>
              <div className="ready-panel-title">相手を招待しよう</div>
              <div className="ready-panel-desc">招待リンクを送って、相手が参加したらバトルの準備ができます。</div>
              <button className="btn-outline" onClick={copyInvite}>{copied ? "コピーしました ✓" : "🔗 招待リンクをコピー"}</button>
            </>
          ) : (
            <>
              <div className="ready-panel-title">バトル開始の準備</div>
              <div className="ready-panel-desc">タスクを提案・承認してから準備OKを押しましょう。お互いの準備が完了するとバトルがスタートします。</div>
              <div className="ready-players">
                <span className={`ready-chip ${myReady ? "is-ready" : ""}`}>{me?.name ?? "自分"}：{myReady ? "準備OK ✓" : "準備中"}</span>
                <span className={`ready-chip ${oppReady ? "is-ready" : ""}`}>{opponent?.name ?? "相手"}：{oppReady ? "準備OK ✓" : "準備中"}</span>
              </div>
              {myReady ? (
                <button className="btn-ready" disabled>相手の準備を待っています…</button>
              ) : (
                <button className="btn-ready" onClick={handleReady} disabled={readyLoading}>{readyLoading ? "..." : "準備OK・バトル開始"}</button>
              )}
            </>
          )}
        </div>
      )}

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
