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
  completed: "終了",
  cancelled: "キャンセル",
};

const statusColor: Record<string, string> = {
  preparing: "bg-yellow-100 text-yellow-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

export function BattleList({ battles }: { battles: Battle[] }) {
  return (
    <div className="flex flex-col gap-3">
      {battles.map((battle) => (
        <Link
          key={battle.id}
          href={`/battles/${battle.id}`}
          className="flex items-center justify-between rounded-[14px] bg-surface p-4 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div>
            <h2 className="font-semibold text-foreground">{battle.title}</h2>
            <p className="mt-1 text-xs text-muted">
              {new Date(battle.period_end).toLocaleDateString("ja-JP")} まで
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[battle.status] ?? ""}`}>
            {statusLabel[battle.status] ?? battle.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
