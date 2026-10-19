import crypto from "crypto";

const SEARCH_ENGINES = [
  "google.",
  "bing.com",
  "yahoo.com",
  "duckduckgo.com",
  "ecosia.org",
  "baidu.com",
  "yandex."
];

const SOCIAL_NETWORKS = [
  "twitter.com",
  "x.com",
  "t.co",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "pinterest.com",
  "tiktok.com",
  "whatsapp.com"
];

/**
 * Sanitizes and extracts the domain from a referrer URL
 * @param {string} referrer
 * @returns {string}
 */
export const extractReferrerDomain = (referrer) => {
  if (!referrer || typeof referrer !== "string") return "";
  try {
    const url = new URL(referrer.startsWith("http") ? referrer : `https://${referrer}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Classifies the incoming traffic source based on referrer and campaign tags
 * @param {string} referrerDomain
 * @param {string} campaign
 * @param {string} utmSource
 * @returns {"direct" | "search" | "social" | "referral" | "campaign"}
 */
export const classifyTrafficSource = (referrerDomain, campaign, utmSource) => {
  if (campaign || utmSource) {
    return "campaign";
  }

  if (!referrerDomain) {
    return "direct";
  }

  // Check if referrer is internal localhost or newsfront
  if (
    referrerDomain.includes("localhost") ||
    referrerDomain.includes("127.0.0.1") ||
    referrerDomain.includes("newsfront.")
  ) {
    return "direct";
  }

  for (const se of SEARCH_ENGINES) {
    if (referrerDomain.includes(se)) {
      return "search";
    }
  }

  for (const sn of SOCIAL_NETWORKS) {
    if (referrerDomain.includes(sn)) {
      return "social";
    }
  }

  return "referral";
};

/**
 * Resolves or establishes anonymous, privacy-conscious visitor and session keys
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {{ visitorKey: string, sessionKey: string, isNewSession: boolean }}
 */
export const resolveVisitorSession = (req, res) => {
  let visitorKey = req.cookies?.nf_vid;
  let sessionKey = req.cookies?.nf_sid;
  let isNewSession = false;

  // 1. Visitor Cookie (1-year lifetime, pseudonymous random token)
  if (!visitorKey || typeof visitorKey !== "string" || visitorKey.length < 16) {
    visitorKey = crypto.randomBytes(16).toString("hex");
  }

  // 2. Session Cookie (30-minute inactivity lifetime)
  if (!sessionKey || typeof sessionKey !== "string" || sessionKey.length < 16) {
    sessionKey = crypto.randomBytes(16).toString("hex");
    isNewSession = true;
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Set or renew visitor cookie
  res.cookie("nf_vid", visitorKey, {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction
  });

  // Set or renew session cookie (sliding 30-minute window)
  res.cookie("nf_sid", sessionKey, {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction
  });

  return { visitorKey, sessionKey, isNewSession };
};

export default {
  extractReferrerDomain,
  classifyTrafficSource,
  resolveVisitorSession
};
