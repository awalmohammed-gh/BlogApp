import assert from "node:assert/strict";
import test from "node:test";
import { createToastStore } from "../src/utils/toast.js";

function fixture() {
  let time = 0;
  let sequence = 0;
  const jobs = new Map();
  const store = createToastStore({
    now: () => time,
    schedule: (callback, delay) => {
      const id = ++sequence;
      jobs.set(id, { callback, at: time + delay });
      return id;
    },
    cancel: (id) => jobs.delete(id),
  });
  const advance = (milliseconds) => {
    const end = time + milliseconds;
    while (true) {
      const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      time = next[1].at;
      jobs.delete(next[0]);
      next[1].callback();
    }
    time = end;
  };
  return { ...store, advance, jobs, entries: () => store.getSnapshot().toasts };
}

test("success expires after four seconds and errors allow six seconds", () => {
  const f = fixture();
  f.toast.success("Saved");
  f.toast.error("Unable to save");
  f.advance(3999);
  assert.equal(f.entries().length, 2);
  f.advance(1);
  assert.deepEqual(f.entries().map((entry) => entry.type), ["error"]);
  f.advance(2000);
  assert.equal(f.entries().length, 0);
});

test("upload progress remains until its ID is updated, then gets a fresh timer", () => {
  const f = fixture();
  const id = f.toast.loading("Uploading", { id: "upload" });
  f.advance(60000);
  assert.equal(f.entries()[0].type, "loading");
  assert.equal(f.jobs.size, 0);
  assert.equal(f.toast.success("Uploaded", { id }), id);
  assert.equal(f.entries().length, 1);
  assert.equal(f.entries()[0].message, "Uploaded");
  f.advance(4000);
  assert.equal(f.entries().length, 0);
});

test("overlapping hover, keyboard and hidden-page pauses preserve remaining time", () => {
  const f = fixture();
  f.toast("Read this", { duration: 1000 });
  f.advance(250);
  f.pause("hover");
  f.pause("focus");
  f.pause("document");
  f.advance(10000);
  f.resume("hover");
  f.resume("document");
  f.advance(10000);
  assert.equal(f.entries().length, 1);
  f.resume("focus");
  f.advance(749);
  assert.equal(f.entries().length, 1);
  f.advance(1);
  assert.equal(f.entries().length, 0);
});

test("messages added or updated while paused wait for the final resume", () => {
  const f = fixture();
  f.pause("document");
  f.toast.loading("Uploading", { id: "task" });
  f.toast.error("Upload failed", { id: "task", duration: 500 });
  f.advance(10000);
  assert.equal(f.entries().length, 1);
  assert.equal(f.jobs.size, 0);
  f.resume("document");
  f.advance(500);
  assert.equal(f.entries().length, 0);
});

test("a burst keeps the five newest messages and cancels evicted timers", () => {
  const f = fixture();
  for (let index = 0; index < 8; index++) f.toast(`Message ${index}`);
  assert.deepEqual(f.entries().map((entry) => entry.message), [7, 6, 5, 4, 3].map((index) => `Message ${index}`));
  assert.equal(f.jobs.size, 5);
  f.toast.dismiss(f.entries()[2].id);
  assert.equal(f.entries().length, 4);
  assert.equal(f.jobs.size, 4);
  f.toast.dismiss();
  assert.equal(f.entries().length, 0);
  assert.equal(f.jobs.size, 0);
});

test("repeated messages get fresh announcements; dismissal does not announce an older message", () => {
  const f = fixture();
  f.toast.warning("Check the selection", { id: "selection" });
  const first = f.getSnapshot().announcement;
  f.toast.warning("Check the selection", { id: "selection" });
  const second = f.getSnapshot().announcement;
  assert.ok(second.version > first.version);
  assert.equal(f.entries().length, 1);
  f.toast.dismiss();
  assert.equal(f.getSnapshot().announcement, second);
});

test("replaced timer callbacks cannot dismiss a newer message with the same ID", () => {
  const f = fixture();
  f.toast.error("Failed", { id: "task" });
  const stale = [...f.jobs.values()][0].callback;
  f.toast.success("Retried", { id: "task" });
  stale();
  assert.equal(f.entries()[0].message, "Retried");
});

test("subscribers receive stable snapshots and can unsubscribe", () => {
  const f = fixture();
  const initial = f.getSnapshot();
  assert.equal(f.getSnapshot(), initial);
  let updates = 0;
  const unsubscribe = f.subscribe(() => updates++);
  f.toast("Hello");
  assert.equal(updates, 1);
  assert.notEqual(f.getSnapshot(), initial);
  unsubscribe();
  f.toast.dismiss();
  assert.equal(updates, 1);
});
