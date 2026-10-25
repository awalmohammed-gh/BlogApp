/**
 * Comment anti-abuse and spam prevention utilities
 */

// Common spam / scam phrases
const SPAM_PATTERNS = [
  /\b(buy\s+viagra|cialis|crypto\s+investment|bitcoin\s+doubler|whatsapp\s*\+?\d{8,}|telegram\s*@\w+|casino\s+online|slot\s+gacor)\b/i,
  /\b(free\s+money|work\s+from\s+home\s+make\s+\$\d+|click\s+here\s+now|earn\s+\$\d{3,}\s+daily)\b/i
];

// Severe abuse / hate speech words
const TOXIC_PATTERNS = [
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|a+s+s+h+o+l+e+|w+h+o+r+e+|c+u+n+t+|n+i+g+g+e+r+|k+y+s+|kill\s+yourself)\b/i
];

export function countUrls(text = "") {
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  return matches ? matches.length : 0;
}

export function containsAbusiveOrSpamContent(text = "") {
  const cleaned = text.trim();

  // 1. Check for spam phrases
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(cleaned)) {
      return { isAbusive: true, reason: "Spam or promotional content is not permitted." };
    }
  }

  // 2. Check for toxic / offensive words
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(cleaned)) {
      return { isAbusive: true, reason: "Your comment contains language that violates our community standards." };
    }
  }

  // 3. Check for repetitive character spam (e.g. "aaaaaaa...")
  if (/(.)\1{7,}/.test(cleaned)) {
    return { isAbusive: true, reason: "Your comment contains excessive repetitive characters." };
  }

  // 4. Check for excessive uppercase shouting (> 80% uppercase on messages > 25 chars)
  const letters = cleaned.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 25) {
    const uppercaseCount = (letters.match(/[A-Z]/g) || []).length;
    if (uppercaseCount / letters.length > 0.8) {
      return { isAbusive: true, reason: "Please do not use excessive uppercase/caps in your comment." };
    }
  }

  return { isAbusive: false };
}
