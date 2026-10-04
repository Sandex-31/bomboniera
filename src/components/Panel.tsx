import { useEffect, useRef, type ReactNode } from "react";
import { useScrollLock } from "../hooks";
import { IconClose } from "./Icons";

type Props = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
};

/**
 * Bottom sheet on phones, right drawer on desktop.
 * Handles Escape, scroll lock, focus capture and focus restore.
 */
export default function Panel({ title, eyebrow, children, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useScrollLock(true);

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => restoreTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button className="scrim" aria-label="Chiudi e torna alla stanza" onClick={onClose} />
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="panel__grip" />
        <header className="panel__head">
          <div className="panel__title">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="panel__back" onClick={onClose}>
              <span aria-hidden="true">←</span> STANZA
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
              <IconClose />
            </button>
          </div>
        </header>
        <div className="panel__body">{children}</div>
      </div>
    </>
  );
}
