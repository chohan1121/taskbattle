import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FriendsView } from "@/components/friends-view";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/friends");

  const { data: profile } = await supabase
    .from("users")
    .select("friend_code")
    .eq("id", user.id)
    .single();

  const { data: rows } = await supabase
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const friendIds = (rows ?? []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));

  const { data: friendUsers } = friendIds.length > 0
    ? await supabase.from("users").select("id, name, avatar_url").in("id", friendIds)
    : { data: [] };

  const friends = (friendUsers ?? []).map((u) => ({
    id: u.id,
    name: u.name ?? "ユーザー",
    initial: (u.name ?? "U").charAt(0).toUpperCase(),
  }));

  return <FriendsView myId={user.id} myCode={profile?.friend_code ?? "------"} friends={friends} justAdded={added === "1"} />;
}
