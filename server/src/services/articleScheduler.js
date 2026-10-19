import crypto from "node:crypto";
import Article from "../models/Article.js";
import { publishApprovedRevision } from "./publicationService.js";

let intervalId = null;
const MAX_ATTEMPTS = 5;
export const runScheduledArticles = async ({ now = new Date(), limit = 50 } = {}) => {
  const result = { published: 0, failed: 0 };
  for (let i = 0; i < limit; i++) {
    const lease = crypto.randomUUID();
    const article = await Article.findOneAndUpdate({
      status: "scheduled", deletedAt: null, scheduledAt: { $lte: now, $ne: null },
      $and: [
        { $or: [{ scheduleAttempts: { $lt: MAX_ATTEMPTS } }, { scheduleAttempts: { $exists: false } }] },
        { $or: [{ scheduleRetryAt: null }, { scheduleRetryAt: { $lte: now } }] },
        { $or: [{ scheduleLeaseUntil: null }, { scheduleLeaseUntil: { $lte: now } }] }
      ]
    }, { $set: { scheduleLease: lease, scheduleLeaseUntil: new Date(now.getTime() + 120000) }, $inc: { scheduleAttempts: 1, __v: 1 } }, { new: true, sort: { scheduledAt: 1 } });
    if (!article) break;
    try {
      await publishApprovedRevision({ articleId: article._id, now, lease });
      result.published++;
    } catch (error) {
      const permanent = [409, 422].includes(error.statusCode);
      await Article.updateOne({ _id: article._id, status: "scheduled", scheduleLease: lease }, { $set: {
        scheduleLease: null, scheduleLeaseUntil: null, scheduleFailedAt: now,
        scheduleFailure: permanent ? "invalid_approval_or_schedule" : "transient_publication_failure",
        ...(permanent ? { scheduleAttempts: MAX_ATTEMPTS } : {}),
        scheduleRetryAt: new Date(now.getTime() + Math.min(3600000, 60000 * 2 ** Math.max(0, article.scheduleAttempts - 1)))
      } });
      console.error(`[Article Scheduler] ${article._id}: ${permanent ? "invalid approval/schedule" : "publication failed"}; attempt ${article.scheduleAttempts}/${MAX_ATTEMPTS}`);
      result.failed++;
    }
  }
  return result;
};
export const startArticleScheduler = () => {
  if (intervalId || process.env.SCHEDULER_MODE === "external") return;
  const tick = () => runScheduledArticles().catch(() => console.error("[Article Scheduler] Unable to retrieve scheduled work."));
  const initialCheck = tick();
  intervalId = setInterval(tick, 60000);
  intervalId.unref?.();
  console.log("[Article Scheduler] Publishing worker active (60s interval).");
  return initialCheck;
};
export const stopArticleScheduler = () => { if (intervalId) clearInterval(intervalId); intervalId = null; };
export default { startArticleScheduler, stopArticleScheduler, runScheduledArticles };
