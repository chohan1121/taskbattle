import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FriendsView } from "@/components/friends-view";

export const dynamic = "force-dynamic";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/friends");

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("users").select("name, friend_code, points").eq("id", user.id).single(),
    supabase.from("friendships").select("user_a, user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
  ]);

  const friendIds = (rows ?? []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));

  const { data: friendUsers } = friendIds.length > 0
    ? await supabase.from("users").select("id, name, points").in("id", friendIds)
    : { data: [] as { id: string; name: string; points: number }[] };

  const myPoints = profile?.points ?? 0;

  const ranking = [
    { id: user.id, name: profile?.name ?? "自分", points: myPoints, isMe: true },
    ...(friendUsers ?? []).map((u) => ({ id: u.id, name: u.name ?? "ユーザー", points: u.points ?? 0, isMe: false })),
  ]
    .sort((a, b) => b.points - a.points)
    .map((r) => ({ ...r, initial: (r.name ?? "U").charAt(0).toUpperCase() }));

  return (
    <FriendsView
      myCode={profile?.friend_code ?? "------"}
      myPoints={myPoints}
      ranking={ranking}
      friendCount={friendIds.length}
      justAdded={added === "1"}
    />
  );
}
