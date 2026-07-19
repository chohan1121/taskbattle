"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewBattlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [periodType, setPeriodType] = useState("preset");
  const [days, setDays] = useState(7);
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      .rpc("create_battle", {
        p_title: title.trim(),
        p_period_end: periodEnd.toISOString(),
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
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <a href="/" className="nav-back">← 戻る</a>

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
          {loading ? "作成中..." : "バトルを作成"}
        </button>
      </form>
    </div>
  );
}
