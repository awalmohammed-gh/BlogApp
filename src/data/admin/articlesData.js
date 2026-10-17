import { articles as rawArticles } from "../../assets/blogs";

// Helper to convert title to slug
export const generateSlug = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Map raw articles with editorial metadata
export const initialArticles = rawArticles.map((art, index) => {
  const slug = generateSlug(art.title);
  
  // Assign a variety of realistic statuses across the mock dataset
  let status = "Published";
  let isFeatured = index === 0 || index === 6 || index === 12;
  let isBreaking = index === 1;
  let scheduledFor = null;
  let editorialNotes = [
    {
      id: `note-${index}-1`,
      date: "July 4, 2025",
      reviewer: "Sarah Mensah",
      note: "Editorial review complete. Fact checks verified with source correspondents.",
      status: "Approved"
    }
  ];

  if (index === 2) {
    status = "Pending Review";
    editorialNotes = [
      {
        id: `note-${index}-1`,
        date: "October 16, 2026",
        reviewer: "Abdul Gaffar",
        note: "Initial submission received. Verification of statistical figures required before clearance.",
        status: "Under Review"
      }
    ];
  } else if (index === 7) {
    status = "Draft";
    editorialNotes = [];
  } else if (index === 10) {
    status = "Scheduled";
    scheduledFor = "2026-10-25T09:00";
    editorialNotes = [
      {
        id: `note-${index}-1`,
        date: "October 15, 2026",
        reviewer: "Sarah Mensah",
        note: "Approved for morning briefing distribution.",
        status: "Approved"
      }
    ];
  } else if (index === 15) {
    status = "Pending Review";
    editorialNotes = [
      {
        id: `note-${index}-1`,
        date: "October 17, 2026",
        reviewer: "Mohammed Awal",
        note: "Awaiting legal desk review on named commercial entities.",
        status: "Under Review"
      }
    ];
  } else if (index === 22) {
    status = "Rejected";
    editorialNotes = [
      {
        id: `note-${index}-1`,
        date: "October 14, 2026",
        reviewer: "Sarah Mensah",
        note: "Insufficient corroborating sources for claims made in paragraph 3. Please revise.",
        status: "Changes Requested"
      }
    ];
  } else if (index === 28) {
    status = "Archived";
  }

  // Tags assignment based on category
  const tagMap = {
    Sports: ["Championship", "Premier League", "Youth Sports"],
    Technology: ["Fintech", "AI & Innovation", "Startups"],
    "Local News": ["Urban Infrastructure", "Elections & Governance", "Breaking News"],
    "Foreign News": ["AfCFTA", "Global Trade", "Diplomacy"],
    Business: ["Commodities & Oil", "AfCFTA", "Banking"],
    "E-commerce": ["Fintech", "Digital Retail", "Logistics"],
    Trading: ["Commodities & Oil", "Currencies", "Exports"],
    Lifestyle: ["Culture & Heritage", "Urban Living", "Arts"]
  };

  const assignedTags = tagMap[art.category] || ["General News", "Analysis"];

  // Generate plain excerpt from description
  const cleanExcerpt = art.description
    ? art.description.replace(/<[^>]*>?/gm, "").slice(0, 160) + "..."
    : art.subTitle || "Detailed coverage from the NewsFront editorial newsroom.";

  // Realistic views count
  const baseViews = 1200 + (index * 743) % 45000;

  return {
    _id: art._id,
    title: art.title,
    subTitle: art.subTitle || "",
    slug: slug,
    category: art.category,
    author: art.author,
    image: art.image,
    date: art.date || "July 5, 2025",
    description: art.description,
    excerpt: cleanExcerpt,
    isPublished: status === "Published",
    status: status,
    views: baseViews,
    isFeatured: isFeatured,
    isBreaking: isBreaking,
    scheduledFor: scheduledFor,
    tags: assignedTags,
    editorialNotes: editorialNotes,
    seo: {
      metaTitle: `${art.title} | NewsFront Official Newsroom`,
      metaDescription: cleanExcerpt,
      keywords: assignedTags.join(", "),
      socialImage: art.image
    }
  };
});
