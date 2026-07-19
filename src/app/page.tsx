import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleList } from "@/components/battle-list";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: battles } = await supabase
    .from("battle_members")
    .select("battle_id, battles(id, title, period_start, period_end, status)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };
  const battleList = (battles ?? [])
    .map((b) => b.battles as unknown as Battle | null)
    .filter((b): b is Battle => b !== null);

  return (
    <main className="flex flex-col gap-6 p-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">バトル</h1>
        <a
          href="/battles/new"
          className="rounded-[14px] bg-primary px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
        >
          + 新規作成
        </a>
      </header>

      {battleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 pt-20 text-center">
          <div className="text-5xl">⚔️</div>
          <p className="text-lg font-medium text-foreground">まだバトルがありません</p>
          <p className="text-sm text-muted">新しいバトルを作成して友達を招待しよう！</p>
        </div>
      ) : (
        <BattleList battles={battleList} />
      )}
    </main>
  );
}
