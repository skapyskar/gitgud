"use client";

import { useState } from "react";
import { Modal, ModalTitle, HudButton, inputCls, labelCls } from "../../components/ui";
import { createFam, FamSummary } from "../famApi";
import { FAM_FREE_LIMIT, FAM_CREATION_COST } from "@/lib/fam-constants";

export default function CreateFamModal({
  ownedCount,
  onClose,
  onCreated,
}: {
  ownedCount: number;
  onClose: () => void;
  onCreated: (fam: FamSummary) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = ownedCount < FAM_FREE_LIMIT;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await createFam({ name, description: description || undefined });
    setBusy(false);
    if (!res) {
      setError("Failed to create Fam — check your coin balance and try again.");
      return;
    }
    onCreated(res.fam);
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle>Create a Fam</ModalTitle>
      <p className="text-sm text-ink3 mb-5">
        {isFree
          ? `Free (${ownedCount}/${FAM_FREE_LIMIT} used)`
          : `Costs ${FAM_CREATION_COST} coins — you've used your ${FAM_FREE_LIMIT} free Fams`}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </div>
        <div>
          <label className={labelCls}>Description (optional)</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} />
        </div>
        {error && <div className="text-sm text-rose-400">{error}</div>}
        <div className="flex gap-2.5">
          <HudButton type="submit" variant="primary" disabled={busy} className="flex-1 py-2.5">
            {busy ? "Creating…" : isFree ? "Create (free)" : `Create (${FAM_CREATION_COST} coins)`}
          </HudButton>
          <HudButton type="button" variant="ghost" className="flex-1 py-2.5" onClick={onClose}>
            Cancel
          </HudButton>
        </div>
      </form>
    </Modal>
  );
}
