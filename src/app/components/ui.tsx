"use client";

import React from "react";
import type { TaskTier } from "../../../prisma/generated/client";

/* Shared building blocks. Every color/radius comes from the theme engine
   (see globals.css), so all skins and light/dark modes restyle these. */

export const inputCls =
  "w-full chip r-md px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 " +
  "focus:outline-none focus:border-acc/60 focus:ring-2 focus:ring-acc/25 transition-all";

export const labelCls = "block text-[11px] font-medium tracking-wide text-ink3 mb-1.5";

/* ── Panel ── */

const ACCENTS = {
  neon: "grad-primary",
  habit: "bg-gradient-to-br from-hab to-acc3",
  gold: "bg-gradient-to-br from-gold to-warm",
  cyan: "bg-gradient-to-br from-acc3 to-hab",
} as const;

export function Panel({
  title,
  accent = "neon",
  right,
  subtitle,
  children,
  className = "",
}: {
  title: React.ReactNode;
  accent?: keyof typeof ACCENTS;
  right?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass r-xl flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full glow-shadow ${ACCENTS[accent]}`} />
            <h3 className="font-display font-semibold text-[15px] text-ink truncate">{title}</h3>
          </div>
          {subtitle && <p className="text-xs text-ink3 mt-0.5 ml-[22px]">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="flex-1 min-h-0 p-4">{children}</div>
    </section>
  );
}

/* ── Buttons ── */

type ButtonVariant = "primary" | "ghost" | "danger" | "habit" | "gold";

export function HudButton({
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "grad-primary text-white glow-shadow hover:brightness-110 border border-white/10",
    ghost: "chip chip-hover text-ink2 hover:text-ink",
    danger:
      "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25 hover:brightness-110 border border-white/10",
    habit:
      "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:brightness-110 border border-white/10",
    gold:
      "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/25 hover:brightness-110 border border-white/10",
  };
  return (
    <button
      {...props}
      className={
        `r-md px-3.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ` +
        `hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ` +
        `${styles[variant]} ${className}`
      }
    />
  );
}

/* ── Modal ── */

export function Modal({
  onClose,
  children,
  accent = "neon",
  wide = false,
}: {
  onClose?: () => void;
  children: React.ReactNode;
  accent?: "neon" | "danger" | "habit";
  wide?: boolean;
}) {
  const ring = {
    neon: "shadow-[0_0_80px_var(--glow)]",
    danger: "shadow-[0_0_80px_rgba(244,63,94,0.25)]",
    habit: "shadow-[0_0_80px_rgba(34,211,238,0.2)]",
  }[accent];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`animate-rise glass r-xl ${ring} w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[85vh] overflow-y-auto p-6`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({
  children,
  color = "text-ink",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <h3 className={`font-display text-xl font-bold mb-1 ${color}`}>{children}</h3>;
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel} accent={danger ? "danger" : "neon"}>
      <ModalTitle>{title}</ModalTitle>
      <div className="text-sm text-ink2 mb-6 leading-relaxed">{body}</div>
      <div className="flex gap-2.5">
        <HudButton
          variant={danger ? "danger" : "primary"}
          className="flex-1 py-2.5"
          onClick={onConfirm}
        >
          {confirmLabel}
        </HudButton>
        <HudButton variant="ghost" className="flex-1 py-2.5" onClick={onCancel}>
          Cancel
        </HudButton>
      </div>
    </Modal>
  );
}

/* ── Tier badge ── */

export const TIER_STYLE: Record<TaskTier, { badge: string; border: string; text: string }> = {
  S: {
    badge: "bg-ts/15 text-ts ring-1 ring-inset ring-ts/40",
    border: "border-l-ts",
    text: "text-ts",
  },
  A: {
    badge: "bg-ta/15 text-ta ring-1 ring-inset ring-ta/40",
    border: "border-l-ta",
    text: "text-ta",
  },
  B: {
    badge: "bg-tb/15 text-tb ring-1 ring-inset ring-tb/40",
    border: "border-l-tb",
    text: "text-tb",
  },
  C: {
    badge: "bg-tc/15 text-tc ring-1 ring-inset ring-tc/40",
    border: "border-l-tc",
    text: "text-tc",
  },
};

export function TierBadge({ tier }: { tier: TaskTier }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 r-md text-[11px] font-bold font-display ${TIER_STYLE[tier].badge}`}
      title={`${tier}-tier`}
    >
      {tier}
    </span>
  );
}
