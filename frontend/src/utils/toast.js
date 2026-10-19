const EMPTY_STATE = { toasts: [], announcement: null, paused: false };
const DURATIONS = { success: 4000, error: 6000, info: 4000, warning: 6000, loading: Infinity };

// This store is independent of React so actions can notify from services and
// providers. React subscribes once through the application toast viewport.
export function createToastStore({ now = Date.now, schedule = setTimeout, cancel = clearTimeout, limit = 5 } = {}) {
  let state = EMPTY_STATE;
  let sequence = 0;
  const listeners = new Set();
  const timers = new Map();
  const pauses = new Set();
  const publish = (toasts, announcement = state.announcement) => {
    state = { toasts, announcement, paused: pauses.size > 0 };
    listeners.forEach((listener) => listener());
  };
  const clearTimer = (id) => {
    const timer = timers.get(id);
    if (timer?.handle !== undefined) cancel(timer.handle);
    timers.delete(id);
  };
  const dismiss = (id) => {
    if (id === undefined) {
      [...timers.keys()].forEach(clearTimer);
      if (state.toasts.length) publish([]);
      return;
    }
    const key = String(id);
    clearTimer(key);
    if (state.toasts.some((entry) => entry.id === key)) publish(state.toasts.filter((entry) => entry.id !== key));
  };
  const startTimer = (id, timer) => {
    if (!Number.isFinite(timer.remaining) || pauses.size) return;
    timer.deadline = now() + timer.remaining;
    timer.handle = schedule(() => {
      if (timers.get(id) === timer) dismiss(id);
    }, timer.remaining);
  };
  const show = (type, message, options = {}) => {
    const version = ++sequence;
    const id = options.id === undefined ? `app-toast-${version}` : String(options.id);
    const requested = options.duration ?? DURATIONS[type];
    const duration = requested === Infinity ? Infinity : Number.isFinite(requested) ? Math.max(0, requested) : DURATIONS[type];
    const text = String(message ?? "Please try again.").trim() || "Please try again.";
    const entry = { id, type, message: text, duration, version };
    const existing = state.toasts.some((item) => item.id === id);
    const next = existing ? state.toasts.map((item) => item.id === id ? entry : item) : [entry, ...state.toasts];
    const visible = next.slice(0, limit);
    next.slice(limit).forEach((item) => clearTimer(item.id));
    clearTimer(id);
    const timer = { remaining: duration };
    timers.set(id, timer);
    startTimer(id, timer);
    publish(visible, { type, message: text, version });
    return id;
  };
  const pause = (reason) => {
    if (pauses.has(reason)) return;
    pauses.add(reason);
    if (pauses.size !== 1) return;
    for (const timer of timers.values()) {
      if (timer.handle !== undefined) {
        cancel(timer.handle);
        timer.handle = undefined;
        timer.remaining = Math.max(0, timer.deadline - now());
      }
    }
    publish(state.toasts);
  };
  const resume = (reason) => {
    if (!pauses.delete(reason) || pauses.size) return;
    timers.forEach((timer, id) => startTimer(id, timer));
    publish(state.toasts);
  };
  const toast = (message, options) => show("info", message, options);
  for (const type of Object.keys(DURATIONS)) toast[type] = (message, options) => show(type, message, options);
  toast.dismiss = dismiss;
  return {
    toast, pause, resume,
    getSnapshot: () => state,
    getServerSnapshot: () => EMPTY_STATE,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export const toastStore = createToastStore();
export default toastStore.toast;
