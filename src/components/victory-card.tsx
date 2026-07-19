"use client";

type Score = {
  userId: string;
  name: string;
  score: number;
};

export function VictoryCard({
  winner,
  scores,
  battleTitle,
}: {
  winner: Score;
  scores: Score[];
  battleTitle: string;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="animate-bounce text-6xl">🏆</div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">{winner.name}</h1>
        <p className="mt-1 text-lg text-primary font-semibold">優勝！</p>
      </div>

      <p className="text-sm text-muted">{battleTitle}</p>

      <div className="w-full max-w-xs rounded-[14px] bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted">最終スコア</h2>
        {scores.map((s, i) => (
          <div key={s.userId} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">{i + 1}</span>
              <span>{s.name}</span>
            </div>
            <span className="text-xl font-bold">{s.score}</span>
          </div>
        ))}
      </div>

      <a
        href="/"
        className="rounded-[14px] bg-primary px-6 py-3 font-semibold text-white transition-transform active:scale-95"
      >
        ホームに戻る
      </a>
    </main>
  );
}
