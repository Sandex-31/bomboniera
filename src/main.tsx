import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import QrPage from "./components/QrPage";
import "./styles/global.css";

const root = document.getElementById("root");
if (root) {
  // #/qr is the printing helper; everything else is the experience itself.
  const isQr = window.location.hash.replace(/^#\/?/, "") === "qr";
  createRoot(root).render(<StrictMode>{isQr ? <QrPage /> : <App />}</StrictMode>);
}
