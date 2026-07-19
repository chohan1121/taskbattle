"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Invite = { battleId: string; battleTitle: string; inviterName: string };

export function InviteList({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const respond = async (battleId: string, accept: boolean) => {
    setBusy(battleId);
    const supabase = createClient();
    const { error } = await supabase.rpc("respond_invite", { p_battle_id: battleId, p_accept: accept });
    setBusy(null);
    if (error) { alert("エラー: " + error.message); return; }
    router.refresh();
  };

  if (invites.length === 0) return null;

  return (
    <div className="invite-section">
      <div className="invite-section-title">⚔️ 招待が届いています</div>
      {invites.map((inv) => (
        <div key={inv.battleId} className="invite-card">
          <div className="invite-info">
            <div className="invite-title">{inv.battleTitle}</div>
            <div className="invite-from">{inv.inviterName} さんから</div>
          </div>
          <div className="invite-actions">
            <button className="invite-decline" onClick={() => respond(inv.battleId, false)} disabled={busy === inv.battleId}>辞退</button>
            <button className="invite-accept" onClick={() => respond(inv.battleId, true)} disabled={busy === inv.battleId}>
              {busy === inv.battleId ? "..." : "参加"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
