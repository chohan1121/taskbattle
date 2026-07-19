"use client";

import Link from "next/link";

type Battle = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  preparing: "準備中",
  active: "進行中",
  completed: "完了",
};

const statusClass: Record<string, string> = {
  preparing: "status-preparing",
  active: "status-active",
  completed: "status-completed",
};

export function BattleList({ battles }: { battles: Battle[] }) {
  const now = new Date();

  return (
    <div style={{ padding: "0 16px" }}>
      {battles.map((battle) => {
        const end = new Date(battle.period_end);
        const start = new Date(battle.period_start);
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return (
          <Link key={battle.id} href={`/battles/${battle.id}`} className="battle-card" style={{ display: "block", marginBottom: 12 }}>
            <div className="battle-header">
              <span className="battle-title">{battle.title}</span>
              <span className={`battle-status ${statusClass[battle.status] ?? ""}`}>
                {statusLabel[battle.status] ?? battle.status}
              </span>
            </div>
            <div className="battle-meta">
              <span>{battle.status === "completed" ? "終了" : `残り${daysLeft}日`}</span>
            </div>
            {battle.status !== "completed" && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
