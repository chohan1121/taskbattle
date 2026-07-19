import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleList } from "@/components/battle-list";
import { InviteList } from "@/components/invite-list";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: myMemberships } = await supabase
    .from("battle_members")
    .select("battle_id, battles(id, title, period_start, period_end, status)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };
  const battleList = (myMemberships ?? [])
    .map((b) => b.battles as unknown as Battle | null)
    .filter((b): b is Battle => b !== null);

  const battleIds = battleList.map((b) => b.id);

  const { data: allMembers } = battleIds.length > 0
    ? await supabase
        .from("battle_members")
        .select("battle_id, user_id, users(id, name, avatar_url)")
        .in("battle_id", battleIds)
    : { data: [] };

  const { data: allTasks } = battleIds.length > 0
    ? await supabase
        .from("tasks")
        .select("battle_id, user_id, status")
        .in("battle_id", battleIds)
        .eq("status", "completed")
    : { data: [] };

  type MemberInfo = { odivId: string; name: string; initial: string };
  type BattleCard = Battle & {
    me: MemberInfo;
    opponent: MemberInfo | null;
    myScore: number;
    oppScore: number;
  };

  const cards: BattleCard[] = battleList.map((battle) => {
    const members = (allMembers ?? []).filter((m) => m.battle_id === battle.id);
    const meMember = members.find((m) => m.user_id === user.id);
    const oppMember = members.find((m) => m.user_id !== user.id);

    const meUser = meMember?.users as unknown as { id: string; name: string; avatar_url: string | null } | null;
    const oppUser = oppMember?.users as unknown as { id: string; name: string; avatar_url: string | null } | null;

    const tasks = (allTasks ?? []).filter((t) => t.battle_id === battle.id);

    return {
      ...battle,
      me: {
        odivId: user.id,
        name: meUser?.name ?? "自分",
        initial: (meUser?.name ?? "U").charAt(0).toUpperCase(),
      },
      opponent: oppMember ? {
        odivId: oppMember.user_id,
        name: oppUser?.name ?? "?",
        initial: (oppUser?.name ?? "?").charAt(0).toUpperCase(),
      } : null,
      myScore: tasks.filter((t) => t.user_id === user.id).length,
      oppScore: oppMember ? tasks.filter((t) => t.user_id === oppMember.user_id).length : 0,
    };
  });

  const { data: inviteRows } = await supabase
    .from("battle_invitations")
    .select("battle_id, inviter_id, battles(title)")
    .eq("invitee_id", user.id)
    .eq("status", "pending");

  const inviterIds = [...new Set((inviteRows ?? []).map((r) => r.inviter_id).filter((x): x is string => !!x))];
  const { data: inviterUsers } = inviterIds.length > 0
    ? await supabase.from("users").select("id, name").in("id", inviterIds)
    : { data: [] };
  const nameById = new Map((inviterUsers ?? []).map((u) => [u.id, u.name]));

  const invites = (inviteRows ?? []).map((r) => ({
    battleId: r.battle_id,
    battleTitle: (r.battles as unknown as { title: string } | null)?.title ?? "バトル",
    inviterName: nameById.get(r.inviter_id ?? "") ?? "フレンド",
  }));

  const initial = (profile?.name ?? "U").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>バトル</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/friends" className="topbar-link" aria-label="フレンド">👥</a>
          <div className="avatar">{initial}</div>
        </div>
      </div>

      <InviteList invites={invites} />

      {cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚔️</div>
          <div className="empty-title">まだバトルがありません</div>
          <div className="empty-desc">友達にバトルを挑んで、<br/>タスク達成で勝負しよう！</div>
          <a href="/battles/new" className="btn-primary" style={{ marginTop: 24, width: "auto", display: "inline-block", padding: "12px 32px" }}>
            最初のバトルを作成
          </a>
        </div>
      ) : (
        <BattleList battles={cards} currentUserId={user.id} />
      )}

      {cards.length > 0 && (
        <a href="/battles/new" className="fab">+</a>
      )}
    </div>
  );
}
