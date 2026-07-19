"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Rank = { id: string; name: string; initial: string; points: number; isMe: boolean };

export function FriendsView({
  myCode,
  myPoints,
  ranking,
  friendCount,
  justAdded,
}: {
  myCode: string;
  myPoints: number;
  ranking: Rank[];
  friendCount: number;
  justAdded: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  const copyCode = async () => {
    await navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddByCode = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setAdding(true);
    setMsg("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_friend_by_code", { p_code: code });
    setAdding(false);
    if (error) { setMsg("エラー: " + error.message); return; }
    if (data === "not_found") { setMsg("そのコードのユーザーが見つかりません"); return; }
    if (data === "self") { setMsg("自分のコードは追加できません"); return; }
    setCodeInput("");
    router.refresh();
  };

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <a href="/" className="nav-back" aria-label="バトル一覧へ戻る">←</a>

      <div className="top-bar" style={{ paddingTop: 8 }}>
        <h1>👥</h1>
      </div>

      {justAdded && (
        <div className="status-banner active" style={{ margin: "0 16px 12px" }}>フレンドを追加しました ✓</div>
      )}

      <div style={{ padding: "0 16px" }}>
        {/* My code + points */}
        <div className="friend-link-box">
          <div className="friend-link-label">あなたのフレンドコード</div>
          <div className="friend-code-value">{myCode}</div>
          <div className="friend-points">⭐ {myPoints} ポイント</div>
          <button className="btn-outline" onClick={copyCode}>{copied ? "コピーしました ✓" : "コードをコピー"}</button>
        </div>

        {/* Add by code */}
        <div className="friend-add-row">
          <input
            className="form-input"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="相手のコード"
            maxLength={6}
            style={{ textTransform: "uppercase" }}
          />
          <button className="btn-primary" style={{ width: "auto", padding: "0 20px" }} onClick={handleAddByCode} disabled={adding}>
            {adding ? "..." : "追加"}
          </button>
        </div>
        {msg && <div className="friend-add-msg">{msg}</div>}

        {/* Ranking */}
        <div className="friend-section-title" style={{ marginTop: 24 }}>🏆 ランキング</div>

        {friendCount === 0 ? (
          <div className="empty-state" style={{ padding: "40px 24px" }}>
            <div className="empty-icon">👥</div>
            <div className="empty-title">まだフレンドがいません</div>
            <div className="empty-desc">あなたのコードを友達に伝えるか、<br/>相手のコードを入力して追加しよう！</div>
          </div>
        ) : (
          <div className="rank-list" style={{ padding: 0 }}>
            {ranking.map((r, i) => (
              <div key={r.id} className={`rank-row ${r.isMe ? "is-me" : ""}`}>
                <span className="rank-pos">{i + 1}</span>
                <div className="rank-avatar">{r.initial}</div>
                <span className="rank-name">{r.name}{r.isMe ? "（自分）" : ""}</span>
                <span className="rank-score">⭐ {r.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
