import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Recovery for occasional cached/truncated Vite prebundle chunks causing blank screen
const installChunkRecovery = () => {
  const key = "__lovable_chunk_recover_attempt__";

  const attemptRecover = () => {
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  };

  window.addEventListener("error", (e) => {
    const msg = String(e.message || "");
    const filename = String((e as ErrorEvent).filename || "");

    if (msg.includes("Unexpected end of script") && filename.includes("/node_modules/.vite/deps/")) {
      attemptRecover();
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    const msg = typeof reason === "string" ? reason : String(reason?.message || "");

    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed")
    ) {
      attemptRecover();
    }
  });
};

installChunkRecovery();

createRoot(document.getElementById("root")!).render(<App />);

