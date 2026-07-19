"use client";

import Link from "next/link";

type Battle = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
  me: { odivId: string; name: string; initial: string };
  opponent: { odivId: string; name: string; initial: string } | null;
  myScore: number;
  oppScore: number;
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

export function BattleList({ battles, currentUserId }: { battles: Battle[]; currentUserId: string }) {
  const now = new Date();

  return (
    <div style={{ padding: "0 14px" }}>
      {battles.map((battle) => {
        const end = new Date(battle.period_end);
        const start = new Date(battle.period_start);
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return (
          <Link key={battle.id} href={`/battles/${battle.id}`} className="battle-card">
            <div className="battle-header">
              <span className="battle-title">{battle.title}</span>
              <span className={`battle-status ${statusClass[battle.status] ?? ""}`}>
                {statusLabel[battle.status] ?? battle.status}
              </span>
            </div>

            <div className="battle-score">
              <div className="score-player">
                <div className="score-avatar score-avatar-me">{battle.me.initial}</div>
                <span className="score-num">{battle.myScore}</span>
              </div>
              <span className="score-vs">VS</span>
              <div className="score-player right">
                {battle.opponent ? (
                  <>
                    <span className="score-num">{battle.oppScore}</span>
                    <div className="score-avatar score-avatar-opponent">{battle.opponent.initial}</div>
                  </>
                ) : (
                  <>
                    <span className="score-num" style={{ opacity: 0.3 }}>?</span>
                    <div className="score-avatar score-avatar-invite">+</div>
                  </>
                )}
              </div>
            </div>

            <div className="battle-meta">
              <span>{battle.status === "completed" ? "終了" : battle.opponent ? `残り${daysLeft}日` : "招待待ち"}</span>
            </div>
            {battle.status !== "completed" && battle.opponent && (
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
