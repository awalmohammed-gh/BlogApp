import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import toast, { toastStore } from "../../utils/toast";

const TYPES = {
  success: { label: "Success", icon: CheckCircle2 },
  error: { label: "Error", icon: CircleAlert },
  info: { label: "Notice", icon: Info },
  warning: { label: "Please note", icon: TriangleAlert },
  loading: { label: "In progress", icon: LoaderCircle },
};

export default function ToastViewport() {
  const { toasts, announcement, paused } = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);
  useEffect(() => {
    const visibility = () => document.hidden ? toastStore.pause("document") : toastStore.resume("document");
    const blur = () => toastStore.pause("window");
    const focus = () => toastStore.resume("window");
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      ["document", "window", "hover", "focus"].forEach(toastStore.resume);
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      toastStore.resume("hover");
      toastStore.resume("focus");
    }
  }, [toasts.length]);

  const text = announcement ? `${TYPES[announcement.type].label}: ${announcement.message}` : "";
  return createPortal(
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={announcement?.version}>{announcement?.type !== "error" ? text : ""}</span></div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true"><span key={announcement?.version}>{announcement?.type === "error" ? text : ""}</span></div>
      <section
        className="app-toast-viewport"
        aria-label="Status messages"
        data-paused={paused}
        data-empty={toasts.length === 0}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") toastStore.pause("hover"); }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") toastStore.resume("hover"); }}
        onFocusCapture={() => toastStore.pause("focus")}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) toastStore.resume("focus"); }}
      >
        <ol className="app-toast-list">
          {toasts.map((entry) => {
            const { label, icon: Icon } = TYPES[entry.type];
            return (
              <li key={entry.id} className={`app-toast app-toast--${entry.type}`} data-toast-id={entry.id}>
                <span className="app-toast-icon" aria-hidden="true"><Icon size={20} className={entry.type === "loading" ? "app-toast-spinner" : undefined} /></span>
                <div className="app-toast-copy"><p className="app-toast-label">{label}</p><p className="app-toast-message">{entry.message}</p></div>
                <button
                  type="button"
                  className="app-toast-close"
                  aria-label={`Dismiss message: ${entry.message}`}
                  onClick={(event) => {
                    if (event.currentTarget === document.activeElement) toastStore.resume("focus");
                    toast.dismiss(entry.id);
                  }}
                ><X size={16} aria-hidden="true" /></button>
                {Number.isFinite(entry.duration) && entry.duration > 0 && <span key={entry.version} className="app-toast-progress" style={{ animationDuration: `${entry.duration}ms` }} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </section>
    </>, document.body,
  );
}
