"use client";

import { useState } from "react";

type Friend = { id: string; name: string; initial: string };

export function FriendsView({ myId, friends, justAdded }: { myId: string; friends: Friend[]; justAdded: boolean }) {
  const [copied, setCopied] = useState(false);

  const friendUrl = typeof window !== "undefined" ? `${window.location.origin}/friend/${myId}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(friendUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <a href="/" className="nav-back">← バトル一覧</a>

      <div className="top-bar" style={{ paddingTop: 8 }}>
        <h1>フレンド</h1>
      </div>

      {justAdded && (
        <div className="status-banner active" style={{ margin: "0 16px 12px" }}>フレンドを追加しました ✓</div>
      )}

      <div style={{ padding: "0 16px" }}>
        <div className="friend-link-box">
          <div className="friend-link-label">あなたのフレンドリンク</div>
          <div className="friend-link-desc">このリンクを送ると、開いた相手とフレンドになれます。</div>
          <button className="btn-outline" onClick={copyLink}>{copied ? "コピーしました ✓" : "🔗 フレンドリンクをコピー"}</button>
        </div>

        <div className="friend-section-title">フレンド{friends.length > 0 && ` (${friends.length})`}</div>

        {friends.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 24px" }}>
            <div className="empty-icon">👥</div>
            <div className="empty-title">まだフレンドがいません</div>
            <div className="empty-desc">上のリンクを友達に送って、<br/>フレンドになろう！</div>
          </div>
        ) : (
          friends.map((f) => (
            <div key={f.id} className="friend-row">
              <div className="friend-avatar">{f.initial}</div>
              <div className="friend-name">{f.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
