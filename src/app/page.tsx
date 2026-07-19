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

  return (
    <main className="flex flex-col gap-5 p-5 pb-24 max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">こんにちは</p>
          <h1 className="text-xl font-bold text-foreground">{profile?.name ?? "ユーザー"}</h1>
        </div>
        <a
          href="/battles/new"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
        >
          + 新規バトル
        </a>
      </header>

      {battleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">⚔️</div>
          <p className="text-lg font-semibold text-foreground">まだバトルがありません</p>
          <p className="text-sm text-muted">新しいバトルを作成して<br/>友達を招待しよう！</p>
          <a
            href="/battles/new"
            className="mt-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            最初のバトルを作成
          </a>
        </div>
      ) : (
        <BattleList battles={battleList} />
      )}
    </main>
  );
}
