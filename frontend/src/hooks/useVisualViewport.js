import { useEffect } from "react";

// CSS dvh handles browser chrome. visualViewport additionally keeps drawers and
// dialogs within the visible area when an on-screen keyboard opens.
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (viewport && viewport.scale !== 1) return;
        document.documentElement.style.setProperty("--overlay-height", `${viewport?.height ?? window.innerHeight}px`);
      });
    };
    update();
    viewport?.addEventListener("resize", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--overlay-height");
    };
  }, []);
}
