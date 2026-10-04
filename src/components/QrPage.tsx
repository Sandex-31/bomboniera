import { useEffect, useRef, useState } from "react";
import { graduationConfig, guests } from "../config";

type Target = { slug: string | null; label: string; url: string };

const buildTargets = (): Target[] => {
  const base = graduationConfig.qrBaseUrl.replace(/\/+$/, "");
  return [
    { slug: null, label: "Generico (bomboniera standard)", url: base + "/" },
    ...Object.entries(guests).map(([slug, g]) => ({
      slug,
      label: g.label,
      url: `${base}/?for=${slug}`,
    })),
  ];
};

function QrTile({ target }: { target: Target }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Loaded on demand: the QR library never reaches the visitor bundle.
    import("qrcode")
      .then((QR) => {
        if (cancelled || !canvas.current) return;
        return QR.toCanvas(canvas.current, target.url, {
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
  }, [target.url]);

  const download = () => {
    const href = canvas.current?.toDataURL("image/png");
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = `qr-${target.slug ?? "generico"}.png`;
    a.click();
  };

  return (
    <div className="card" style={{ cursor: "default", textAlign: "center" }}>
      <div className="card__meta" style={{ marginBottom: 12 }}>
        {target.label}
      </div>
      {error ? (
        <p className="empty">{error}</p>
      ) : (
        <canvas ref={canvas} style={{ maxWidth: "100%", borderRadius: 10 }} />
      )}
      <p className="mono" style={{ fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>
        {target.url}
      </p>
      <button className="chip" onClick={download}>
        scarica PNG
      </button>
    </div>
  );
}

/**
 * Utility page at #/qr — not part of the visitor experience.
 * Renders one printable QR per bomboniera variant from src/config.ts.
 */
export default function QrPage() {
  const targets = buildTargets();

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
      <span className="eyebrow">utilità interna</span>
      <h1 style={{ fontSize: 30, margin: "6px 0 10px" }}>QR della bomboniera</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5 }}>
        Gli URL vengono da <code className="mono">graduationConfig.qrBaseUrl</code> e dalla mappa{" "}
        <code className="mono">guests</code> in <code className="mono">src/config.ts</code>. Cambia
        lì il dominio prima di stampare.
      </p>
      <div className="card-list" style={{ marginTop: 24 }}>
        {targets.map((t) => (
          <QrTile key={t.url} target={t} />
        ))}
      </div>
      <p style={{ marginTop: 28 }}>
        <a href="./">← torna alla stanza</a>
      </p>
    </main>
  );
}
