import { useEffect } from "react";

type Props = {
  title: string;
  message: string;
  icon?: string;
  onDismiss: () => void;
};

/** Auto-dismissing announcement used for easter-egg discoveries. */
export default function Toast({ title, message, icon = "✦", onDismiss }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 4600);
    return () => window.clearTimeout(id);
  }, [onDismiss, message]);

  return (
    <div className="toast" role="status" aria-live="polite" onClick={onDismiss}>
      <span className="toast__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <b>{title}</b>
        <p>{message}</p>
      </div>
    </div>
  );
}
