import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AddFriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/friend/${id}`);
  }

  const { data: result } = await supabase.rpc("add_friend", { p_other: id });

  if (result === "not_found") {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">ユーザーが見つかりません</p>
          <a href="/friends" className="mt-4 inline-block text-sm text-primary">フレンド一覧へ</a>
        </div>
      </main>
    );
  }

  redirect(`/friends?added=1`);
}
