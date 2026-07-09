import { ConfirmModal } from "gitgud";

export const DeleteQuest = () => (
  <ConfirmModal
    title="Delete quest?"
    body={
      <>
        <span className="text-ink font-medium">Ship the release candidate</span> will be permanently
        deleted and its XP clawed back. This cannot be undone.
      </>
    }
    confirmLabel="Delete"
    onConfirm={() => {}}
    onCancel={() => {}}
  />
);
