"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { HudButton } from "../../components/ui";
import {
  fetchMyFams,
  fetchFamDetail,
  FamMembershipRow,
  PendingInvite,
  FamSummary,
  FamMemberDetail,
} from "../famApi";
import FamListPanel from "./FamListPanel";
import PendingInvitesPanel from "./PendingInvitesPanel";
import BrowseFamsPanel from "./BrowseFamsPanel";
import CreateFamModal from "./CreateFamModal";
import FamDetailView from "./FamDetailView";

export default function FamPageClient({
  currentUserId,
  onNavDash,
}: {
  currentUserId: string;
  onNavDash: () => void;
}) {
  const [memberships, setMemberships] = useState<FamMembershipRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedFamId, setSelectedFamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ fam: FamSummary; members: FamMemberDetail[] } | null>(null);
  const [creating, setCreating] = useState(false);

  const loadMine = useCallback(async () => {
    const res = await fetchMyFams();
    setMemberships(res?.memberships ?? []);
    setPendingInvites(res?.pendingInvites ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    if (memberships.length > 0 && !selectedFamId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFamId(memberships[0].fam.id);
    }
  }, [memberships, selectedFamId]);

  const loadDetail = useCallback(async (famId: string) => {
    const res = await fetchFamDetail(famId);
    if (res) setDetail({ fam: res.fam, members: res.members });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedFamId) loadDetail(selectedFamId);
    else setDetail(null);
  }, [selectedFamId, loadDetail]);

  const refreshAll = () => {
    loadMine();
    if (selectedFamId) loadDetail(selectedFamId);
  };

  // Leaving/deleting removes the fam you're currently looking at, so clear
  // the selection instead of re-fetching detail for a fam you're no longer
  // in — that fetch would 403/404 and, since loadDetail only calls setDetail
  // on success, leave the stale detail view visible. Clearing selectedFamId
  // resets detail immediately, then the auto-select effect below picks
  // another fam once the refreshed membership list lands (or leaves the
  // panel empty if none remain).
  const handleDeparted = () => {
    setSelectedFamId(null);
    loadMine();
  };

  const ownedCount = memberships.filter((m) => m.role === "OWNER").length;

  return (
    <div
      className="min-h-screen relative z-10 px-4 sm:px-9 py-8 flex flex-col gap-5 max-w-5xl mx-auto"
      style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
    >
      <div className="flex items-center gap-3">
        <button onClick={onNavDash} className="chip chip-hover r-lg w-9 h-9 grid place-items-center shrink-0" title="Back to dashboard">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex-1">Fam</h1>
        <HudButton variant="primary" onClick={() => setCreating(true)}>
          Create Fam
        </HudButton>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FamListPanel memberships={memberships} selectedFamId={selectedFamId} onSelect={setSelectedFamId} />
        <PendingInvitesPanel invites={pendingInvites} onResolved={refreshAll} />
      </div>

      {detail && (
        <FamDetailView
          fam={detail.fam}
          members={detail.members}
          currentUserId={currentUserId}
          onChanged={refreshAll}
          onDeparted={handleDeparted}
        />
      )}

      <BrowseFamsPanel />

      {creating && (
        <CreateFamModal
          ownedCount={ownedCount}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
