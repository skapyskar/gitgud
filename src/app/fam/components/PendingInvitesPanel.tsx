"use client";

import { Panel, HudButton } from "../../components/ui";
import { PendingInvite, respondToInvite } from "../famApi";

export default function PendingInvitesPanel({
  invites,
  onResolved,
}: {
  invites: PendingInvite[];
  onResolved: () => void;
}) {
  const respond = async (inviteId: string, action: "accept" | "decline") => {
    await respondToInvite({ inviteId, action });
    onResolved();
  };

  return (
    <Panel title="Pending invites" accent="cyan">
      {invites.length === 0 ? (
        <p className="text-sm text-ink3">No pending invites.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((inv) => (
            <div key={inv.id} className="chip r-lg flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex-1 text-sm font-semibold truncate">{inv.fam.name}</span>
              <HudButton variant="primary" onClick={() => respond(inv.id, "accept")}>
                Accept
              </HudButton>
              <HudButton variant="ghost" onClick={() => respond(inv.id, "decline")}>
                Decline
              </HudButton>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
