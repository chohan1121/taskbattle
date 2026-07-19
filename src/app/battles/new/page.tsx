"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Friend = { id: string; name: string; initial: string };

export default function NewBattlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [periodType, setPeriodType] = useState("preset");
  const [days, setDays] = useState(7);
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await supabase
        .from("friendships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const ids = (rows ?? []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));
      if (ids.length === 0) { setFriends([]); return; }
      const { data: us } = await supabase.from("users").select("id, name").in("id", ids);
      setFriends((us ?? []).map((u) => ({
        id: u.id,
        name: u.name ?? "ユーザー",
        initial: (u.name ?? "U").charAt(0).toUpperCase(),
      })));
    })();
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    let periodEnd: Date;
    if (periodType === "custom" && customDate) {
      periodEnd = new Date(customDate + "T23:59:59");
      if (periodEnd <= new Date()) {
        setError("終了日は今日より後にしてください");
        setLoading(false);
        return;
      }
    } else {
      periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + days);
    }

    const { data: battleId, error: rpcError } = await supabase
      .rpc("create_battle_with_invites", {
        p_title: title.trim(),
        p_period_end: periodEnd.toISOString(),
        p_invitees: selected,
      });

    if (rpcError || !battleId) {
      setError(rpcError?.message ?? "作成に失敗しました");
      setLoading(false);
      return;
    }

    router.push(`/battles/${battleId}`);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="app-shell">
      <a href="/" className="nav-back" aria-label="戻る">←</a>

      <form onSubmit={handleSubmit} className="form-page">
        <h1 className="form-title">新しいバトル</h1>

        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 1週間コーディングバトル"
            className="form-input"
            maxLength={50}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">対戦相手を選ぶ（複数可）</label>
          {friends.length === 0 ? (
            <div className="friend-select-empty">
              まだフレンドがいません。<a href="/friends" style={{ color: "var(--primary)", fontWeight: 600 }}>フレンドを追加</a>するか、作成後に招待リンクを送れます。
            </div>
          ) : (
            <div className="friend-select-grid">
              {friends.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  className={`friend-select-chip ${selected.includes(f.id) ? "selected" : ""}`}
                  onClick={() => toggle(f.id)}
                >
                  <span className="friend-select-avatar">{f.initial}</span>
                  <span>{f.name}</span>
                  {selected.includes(f.id) && <span className="friend-select-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">期間</label>
          <div className="form-toggle-row">
            <button
              type="button"
              onClick={() => setPeriodType("preset")}
              className={`form-toggle ${periodType === "preset" ? "active" : ""}`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("custom")}
              className={`form-toggle ${periodType === "custom" ? "active" : ""}`}
            >
              日付指定
            </button>
          </div>

          {periodType === "preset" ? (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="form-input"
            >
              <option value={3}>3日間</option>
              <option value={7}>1週間</option>
              <option value={14}>2週間</option>
              <option value={30}>1ヶ月</option>
            </select>
          ) : (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={todayStr}
              className="form-input"
              required={periodType === "custom"}
            />
          )}
        </div>

        <button type="submit" disabled={loading || !title.trim()} className="btn-primary">
          {loading ? "作成中..." : selected.length > 0 ? `バトルを作成して${selected.length}人を招待` : "バトルを作成"}
        </button>
      </form>
    </div>
  );
}
