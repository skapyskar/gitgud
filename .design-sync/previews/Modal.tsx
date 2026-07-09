import { Modal, ModalTitle, HudButton } from "gitgud";

export const BeatTheClock = () => (
  <Modal onClose={() => {}}>
    <ModalTitle>Beat the clock?</ModalTitle>
    <p className="text-sm text-ink2 mb-1">
      Did you finish within <span className="grad-text font-bold">45 minutes</span>?
    </p>
    <p className="text-xs text-gold mb-5">+25% XP for beating the time limit</p>
    <div className="flex gap-2.5">
      <HudButton variant="primary" className="flex-1 py-2.5">
        Yes (+25%)
      </HudButton>
      <HudButton variant="ghost" className="flex-1 py-2.5">
        No
      </HudButton>
    </div>
  </Modal>
);
