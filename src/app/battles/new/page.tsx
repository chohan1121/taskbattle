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
    <main className="flex flex-col gap-6 p-6">
      <a href="/" className="text-sm text-muted">← 戻る</a>
      <h1 className="text-2xl font-bold">新しいバトル</h1>

      {error && (
        <div className="rounded-[14px] bg-loss/10 px-4 py-3 text-sm text-loss">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 1週間コーディングバトル"
            className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted">期間</label>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPeriodType("preset")}
              className={`flex-1 rounded-[14px] py-2 text-sm font-medium transition-colors ${
                periodType === "preset"
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground border border-border"
              }`}
            >
              プリセット
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("custom")}
              className={`flex-1 rounded-[14px] py-2 text-sm font-medium transition-colors ${
                periodType === "custom"
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground border border-border"
              }`}
            >
              日付指定
            </button>
          </div>

          {periodType === "preset" ? (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required={periodType === "custom"}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="mt-2 rounded-[14px] bg-primary py-3 font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? "作成中..." : "バトルを作成"}
        </button>
      </form>
    </main>
  );
}
