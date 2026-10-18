import { Trophy, Cpu, Newspaper, Radio, Briefcase, ShoppingBag, LineChart, Coffee, Landmark, Globe, TrendingUp } from "lucide-react";
import sports from "../assets/categories/sports.jpg";
import technology from "../assets/categories/technology.jpg";
import localNews from "../assets/categories/local-news.jpg";
import foreignNews from "../assets/categories/foreign-news.jpg";
import business from "../assets/categories/business.jpg";
import ecommerce from "../assets/categories/e-commerce.jpg";
import trading from "../assets/categories/trading.jpg";
import lifestyle from "../assets/categories/lifestyle.jpg";
import politics from "../assets/categories/politics.jpg";
import world from "../assets/categories/world.jpg";
import latest from "../assets/categories/latest.jpg";

/**
 * Public news desks. `includes` lists the article category slugs a desk shows:
 * Business gathers Trading and E-commerce, World gathers Foreign News, and
 * Latest (null) shows every published story.
 */
export const DESKS = [
  { slug: "latest", name: "Latest", icon: TrendingUp, image: latest, includes: null,
    tagline: "Every new story from the newsroom, newest first." },
  { slug: "sports", name: "Sports", icon: Trophy, image: sports, includes: ["sports"],
    tagline: "Football, athletics and championships from Ghana and around the world." },
  { slug: "technology", name: "Technology", icon: Cpu, image: technology, includes: ["technology"],
    tagline: "Startups, AI, connectivity and the ideas changing how we live and work." },
  { slug: "local-news", name: "Local News", icon: Newspaper, image: localNews, includes: ["local-news"],
    tagline: "Communities, civic life and developments across Ghana's regions." },
  { slug: "foreign-news", name: "Foreign News", icon: Radio, image: foreignNews, includes: ["foreign-news"],
    tagline: "Diplomacy, summits and international affairs." },
  { slug: "business", name: "Business", icon: Briefcase, image: business, includes: ["business", "trading", "e-commerce"],
    tagline: "Companies, markets and the economy." },
  { slug: "e-commerce", name: "E-commerce", icon: ShoppingBag, image: ecommerce, includes: ["e-commerce"],
    tagline: "Online retail, shopping trends and digital commerce." },
  { slug: "trading", name: "Trading", icon: LineChart, image: trading, includes: ["trading"],
    tagline: "Stocks, crypto, commodities and the forces moving markets." },
  { slug: "lifestyle", name: "Lifestyle", icon: Coffee, image: lifestyle, includes: ["lifestyle"],
    tagline: "Wellness, food, fashion, travel and living well." },
  { slug: "politics", name: "Politics", icon: Landmark, image: politics, includes: ["politics"],
    tagline: "Government, elections and policy." },
  { slug: "world", name: "World", icon: Globe, image: world, includes: ["world", "foreign-news"],
    tagline: "The biggest developments from every continent." }
];

const BY_SLUG = new Map(DESKS.map((d) => [d.slug, d]));

export const toCategorySlug = (name) =>
  (name || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Desk definition for a URL slug; unknown categories get a generic desk using the latest image. */
export const getDesk = (slug) => {
  const key = toCategorySlug(slug);
  if (BY_SLUG.has(key)) return BY_SLUG.get(key);
  const name = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "News";
  return { slug: key, name, icon: Newspaper, image: latest, includes: [key], tagline: `Stories from the ${name} desk.` };
};

/** Image that describes an article category (by its name or slug). */
export const deskImage = (category) => getDesk(category).image;

/** Published stories that belong on a desk. */
export const storiesForDesk = (desk, articles) =>
  (articles || []).filter((a) => a.isPublished && (!desk.includes || desk.includes.includes(a.categorySlug || toCategorySlug(a.category))));
