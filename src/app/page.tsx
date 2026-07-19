import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleList } from "@/components/battle-list";
import { InviteList } from "@/components/invite-list";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  type Battle = { id: string; title: string; period_start: string; period_end: string; status: string };

  // Wave 1: everything that only needs the user id, in parallel.
  const [{ data: profile }, { data: myMemberships }, { data: inviteRows }] = await Promise.all([
    supabase.from("users").select("name, points").eq("id", user.id).single(),
    supabase
      .from("battle_members")
      .select("battle_id, battles(id, title, period_start, period_end, status)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
    supabase
      .from("battle_invitations")
      .select("battle_id, inviter_id, battles(title)")
      .eq("invitee_id", user.id)
      .eq("status", "pending"),
  ]);

  const battleList = (myMemberships ?? [])
    .map((b) => b.battles as unknown as Battle | null)
    .filter((b): b is Battle => b !== null);
  const battleIds = battleList.map((b) => b.id);
  const inviterIds = [...new Set((inviteRows ?? []).map((r) => r.inviter_id).filter((x): x is string => !!x))];

  // Wave 2: everything that needs the ids from wave 1, in parallel.
  const [{ data: allMembers }, { data: allTasks }, { data: inviterUsers }] = await Promise.all([
    battleIds.length > 0
      ? supabase.from("battle_members").select("battle_id, user_id, users(id, name, avatar_url)").in("battle_id", battleIds)
      : Promise.resolve({ data: [] as { battle_id: string; user_id: string; users: unknown }[] }),
    battleIds.length > 0
      ? supabase.from("tasks").select("battle_id, user_id, status").in("battle_id", battleIds).eq("status", "completed")
      : Promise.resolve({ data: [] as { battle_id: string; user_id: string; status: string }[] }),
    inviterIds.length > 0
      ? supabase.from("users").select("id, name").in("id", inviterIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  type MemberInfo = { userId: string; name: string; initial: string };
  type BattleCard = Battle & {
    me: MemberInfo;
    opponent: MemberInfo | null;
    myScore: number;
    oppScore: number;
    memberCount: number;
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
        userId: user.id,
        name: meUser?.name ?? "自分",
        initial: (meUser?.name ?? "U").charAt(0).toUpperCase(),
      },
      opponent: oppMember ? {
        userId: oppMember.user_id,
        name: oppUser?.name ?? "?",
        initial: (oppUser?.name ?? "?").charAt(0).toUpperCase(),
      } : null,
      myScore: tasks.filter((t) => t.user_id === user.id).length,
      oppScore: oppMember ? tasks.filter((t) => t.user_id === oppMember.user_id).length : 0,
      memberCount: members.length,
    };
  });

  const nameById = new Map((inviterUsers ?? []).map((u) => [u.id, u.name]));
  const invites = (inviteRows ?? []).map((r) => ({
    battleId: r.battle_id,
    battleTitle: (r.battles as unknown as { title: string } | null)?.title ?? "バトル",
    inviterName: nameById.get(r.inviter_id ?? "") ?? "フレンド",
  }));

  const initial = (profile?.name ?? "U").charAt(0).toUpperCase();
  const points = profile?.points ?? 0;

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>バトル</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/friends" className="topbar-link" aria-label="ランキング">⭐ {points}</a>
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
