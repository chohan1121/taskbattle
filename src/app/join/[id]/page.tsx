import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JoinBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/join/${id}`);
  }

  const { data: result } = await supabase.rpc("join_battle", { p_battle_id: id });

  if (result === "not_found") {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">バトルが見つかりません</p>
          <a href="/" className="mt-4 inline-block text-sm text-primary">ホームに戻る</a>
        </div>
      </main>
    );
  }

  redirect(`/battles/${id}`);
}
