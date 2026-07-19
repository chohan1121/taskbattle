import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleList } from "@/components/battle-list";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: battles } = await supabase
    .from("battle_members")
    .select("battle_id, battles(id, title, period_start, period_end, status)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };
  const battleList = (battles ?? [])
    .map((b) => b.battles as unknown as Battle | null)
    .filter((b): b is Battle => b !== null);

  const initial = (profile?.name ?? "U").charAt(0).toUpperCase();

  return (
    <main className="flex flex-col gap-5 p-5 pb-24 max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">バトル</h1>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-sm font-semibold text-white">
          {initial}
        </div>
      </header>

      {battleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
          <div className="text-5xl opacity-60">⚔️</div>
          <p className="text-lg font-semibold text-foreground">まだバトルがありません</p>
          <p className="text-sm text-muted leading-relaxed">友達にバトルを挑んで、<br/>タスク達成で勝負しよう！</p>
          <a
            href="/battles/new"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-8 py-3 font-semibold text-white shadow-md transition-transform active:scale-95"
          >
            最初のバトルを作成
          </a>
        </div>
      ) : (
        <BattleList battles={battleList} />
      )}

      {battleList.length > 0 && (
        <a
          href="/battles/new"
          className="fixed bottom-7 right-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-2xl font-light text-white shadow-lg shadow-primary/30 transition-transform active:scale-90"
        >
          +
        </a>
      )}
    </main>
  );
}
