import { useEffect, useRef, useState } from "react";
import { graduationConfig } from "../config";

const url = graduationConfig.qrBaseUrl.replace(/\/+$/, "") + "/";

function QrTile() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Loaded on demand: the QR library never reaches the visitor bundle.
    import("qrcode")
      .then((QR) => {
        if (cancelled || !canvas.current) return;
        return QR.toCanvas(canvas.current, url, {
          width: 260,
          margin: 1,
          color: { dark: "#090B10", light: "#F3EEE3" },
          errorCorrectionLevel: "M",
        });
      })
      .catch(() => !cancelled && setError("Impossibile generare il QR."));
    return () => {
      cancelled = true;
    };
  }, []);

  const download = () => {
    const href = canvas.current?.toDataURL("image/png");
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = "qr-bomboniera.png";
    a.click();
  };

  return (
    <div className="card" style={{ cursor: "default", textAlign: "center" }}>
      {error ? (
        <p className="empty">{error}</p>
      ) : (
        <canvas ref={canvas} style={{ maxWidth: "100%", borderRadius: 10 }} />
      )}
      <p className="mono" style={{ fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>
        {url}
      </p>
      <button className="chip" onClick={download}>
        scarica PNG
      </button>
    </div>
  );
}

/**
 * Utility page at #/qr — not part of the visitor experience.
 * Renders the printable QR of the bomboniera from src/config.ts.
 */
export default function QrPage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
      <span className="eyebrow">utilità interna</span>
      <h1 style={{ fontSize: 30, margin: "6px 0 10px" }}>QR della bomboniera</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5 }}>
        L'URL viene da <code className="mono">graduationConfig.qrBaseUrl</code> in{" "}
        <code className="mono">src/config.ts</code>. Cambia lì il dominio prima di stampare.
      </p>
      <div className="card-list" style={{ marginTop: 24 }}>
        <QrTile />
      </div>
      <p style={{ marginTop: 28 }}>
        <a href="./">← torna alla stanza</a>
      </p>
    </main>
  );
}
