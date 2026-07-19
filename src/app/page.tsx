import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleList } from "@/components/battle-list";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="top-bar">
        <h1>バトル</h1>
        <div className="avatar">{initial}</div>
      </div>

      {battleList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚔️</div>
          <div className="empty-title">まだバトルがありません</div>
          <div className="empty-desc">友達にバトルを挑んで、<br/>タスク達成で勝負しよう！</div>
          <a href="/battles/new" className="btn-primary" style={{ marginTop: 24, width: "auto", display: "inline-block", padding: "12px 32px" }}>
            最初のバトルを作成
          </a>
        </div>
      ) : (
        <BattleList battles={battleList} />
      )}

      {battleList.length > 0 && (
        <a href="/battles/new" className="fab">+</a>
      )}
    </div>
  );
}
