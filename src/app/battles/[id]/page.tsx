import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BattleDetail } from "@/components/battle-detail";

export const dynamic = "force-dynamic";

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .select("*")
    .eq("id", id)
    .single();

  if (battleError) {
    console.error("Battle fetch error:", battleError.message, "user:", user.id, "battle:", id);
  }

  if (!battle) notFound();

  // Battle end detection: if period_end passed and still active, finalize
  // (marks completed + awards the winner's bonus points; any member can trigger).
  if (battle.status === "active" && new Date(battle.period_end) < new Date()) {
    await supabase.rpc("finalize_battle", { p_battle_id: id });
    battle.status = "completed";
  }

  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase
      .from("battle_members")
      .select("user_id, role, is_ready, users(id, name, avatar_url)")
      .eq("battle_id", id),
    supabase
      .from("tasks")
      .select("*")
      .eq("battle_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const memberList = (members ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string; avatar_url: string | null } | null;
    return {
      user_id: m.user_id,
      role: m.role,
      name: u?.name ?? "ユーザー",
      avatarUrl: u?.avatar_url ?? null,
      isReady: (m as { is_ready?: boolean }).is_ready ?? false,
    };
  });

  const scores = memberList.map((m) => ({
    userId: m.user_id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    score: (tasks ?? []).filter((t) => t.user_id === m.user_id && t.status === "completed").length,
  }));

  return (
    <BattleDetail
      battle={battle}
      members={memberList}
      tasks={tasks ?? []}
      scores={scores}
      currentUserId={user.id}
    />
  );
}
