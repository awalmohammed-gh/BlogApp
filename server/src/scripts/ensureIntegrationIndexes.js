import connectDatabase, { disconnectDatabase } from "../config/database.js";
import Article from "../models/Article.js";
import ArticleComment from "../models/ArticleComment.js";
import SiteSettings from "../models/SiteSettings.js";
import ContactSubmission from "../models/ContactSubmission.js";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import AdminInvitation from "../models/AdminInvitation.js";
import Notification from "../models/Notification.js";

// Add required indexes without dropping or rewriting existing application data.
try {
  await connectDatabase();
  for (const model of [Article, ArticleComment, SiteSettings, ContactSubmission, NewsletterSubscriber, AdminInvitation, Notification]) {
    await model.createIndexes();
    console.log(`[Indexes] ${model.modelName} ready`);
  }
} catch {
  console.error("Unable to create integration indexes. Review database connectivity and existing duplicate records before retrying.");
  process.exitCode = 1;
} finally { await disconnectDatabase(); }
