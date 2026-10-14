import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App";
import QrPage from "./components/QrPage";
import { parseLabsHash } from "./labs/route";

const LabsPage = lazy(() => import("./labs/LabsPage"));

/** #/qr → printing helper, #/progetti… → the labs, anything else → the room. */
export default function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => {
      const next = window.location.hash;
      // a new project or page starts at the top; moving between files of the same project does not
      setHash((prev) => {
        if (parseLabsHash(prev)?.id !== parseLabsHash(next)?.id) window.scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (hash.replace(/^#\/?/, "") === "qr") return <QrPage />;
  const labs = parseLabsHash(hash);
  if (labs)
    return (
      <Suspense fallback={<p className="labs-loading">apro il laboratorio…</p>}>
        <LabsPage route={labs} />
      </Suspense>
    );
  return <App />;
}
