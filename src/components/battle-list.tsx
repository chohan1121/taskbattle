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
  cancelled: "キャンセル",
};

const statusStyle: Record<string, string> = {
  preparing: "bg-primary-glow text-primary",
  active: "bg-[rgba(34,197,94,0.12)] text-win",
  completed: "bg-surface-2 text-muted",
  cancelled: "bg-[rgba(239,68,68,0.1)] text-loss",
};

export function BattleList({ battles }: { battles: Battle[] }) {
  const now = new Date();

  return (
    <div className="flex flex-col gap-3">
      {battles.map((battle) => {
        const end = new Date(battle.period_end);
        const start = new Date(battle.period_start);
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return (
          <Link
            key={battle.id}
            href={`/battles/${battle.id}`}
            className="block rounded-[14px] bg-surface border border-border p-4 transition-colors hover:bg-surface-2"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="font-semibold text-[0.95rem] text-foreground">{battle.title}</span>
              <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${statusStyle[battle.status] ?? ""}`}>
                {statusLabel[battle.status] ?? battle.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-[0.75rem] text-muted">
              <span>{battle.status === "completed" ? "終了" : `残り${daysLeft}日`}</span>
            </div>

            {battle.status !== "completed" && (
              <div className="mt-3 h-[3px] rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
