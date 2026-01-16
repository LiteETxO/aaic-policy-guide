import "./index.css";
import { createRoot } from "react-dom/client";

// Recovery for occasional cached/truncated Vite prebundle chunks causing blank screen
const RECOVER_KEY = "__lovable_chunk_recover_attempt__";

const attemptRecover = () => {
  if (sessionStorage.getItem(RECOVER_KEY) === "1") return;
  sessionStorage.setItem(RECOVER_KEY, "1");

  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
};

const installChunkRecovery = () => {
  const isTruncatedViteChunk = (msg: string, filename: string) =>
    msg.includes("Unexpected end of script") && filename.includes("/node_modules/.vite/deps/");

  window.addEventListener("error", (e) => {
    const msg = String(e.message || "");
    const filename = String((e as ErrorEvent).filename || "");
    if (isTruncatedViteChunk(msg, filename)) attemptRecover();
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

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

// If the HTML boot screen is visible, update it as we progress.
const bootMsgEl = document.getElementById("__boot_msg");
if (bootMsgEl) bootMsgEl.textContent = "Loading app";

const root = createRoot(rootEl);

// IMPORTANT: dynamically import App so recovery logic can run even if a prebundled chunk is truncated
import("./App.tsx")
  .then(({ default: App }) => {
    // Successful load → allow recovery to happen again in the future
    sessionStorage.removeItem(RECOVER_KEY);
    root.render(<App />);
  })
  .catch((err) => {
    const msg = String(err?.message || err || "");
    const alreadyTried = sessionStorage.getItem(RECOVER_KEY) === "1";

    // Truncated/invalid JS chunk in cache → hard reload with cache buster (once)
    if (msg.includes("Unexpected end of script")) {
      if (!alreadyTried) {
        attemptRecover();
        return;
      }

      // If we've already tried recovering, show a helpful fallback instead of a blank screen.
      root.render(
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 space-y-3">
            <h1 className="text-lg font-semibold">Loading error</h1>
            <p className="text-sm text-muted-foreground">
              Your browser loaded a truncated cached script. Please hard refresh (Ctrl/Cmd+Shift+R) or open the site in an
              incognito window.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => {
                sessionStorage.removeItem(RECOVER_KEY);
                const url = new URL(window.location.href);
                url.searchParams.set("_r", Date.now().toString());
                window.location.replace(url.toString());
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
      return;
    }

    console.error("Failed to load app entry:", err);
    throw err;
  });
