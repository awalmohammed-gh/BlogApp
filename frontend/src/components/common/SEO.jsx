import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { setPageMeta } from "../../utils/setPageMeta";

/**
 * Reusable SEO component for managing title, meta description, canonical URLs,
 * Open Graph, Twitter Cards, Google Rich Snippet (JSON-LD structured data), and robot directives.
 */
export const SEO = ({
  title,
  description,
  canonical,
  image,
  type = "website",
  robots = "index, follow",
  article = null,
  structuredData = null
}) => {
  const { settings } = useSiteSettings();
  const location = useLocation();

  const siteName = settings?.general?.siteName || "Nsemfoa News";
  const defaultDesc =
    settings?.seo?.defaultMetaDescription ||
    "Independent journalism, insights and perspectives from Ghana, Africa and beyond.";
  const defaultImage = settings?.seo?.defaultOgImage || "/app-logo.png";
  const twitterHandle = settings?.seo?.twitterHandle || "";

  // Title formatting: avoid repeating brand if already included
  const fullTitle = title
    ? title.includes(siteName)
      ? title
      : `${title} | ${siteName}`
    : settings?.seo?.defaultMetaTitle || `${siteName} - Stories That Matter`;

  const metaDesc = description || defaultDesc;
  const canonicalUrl =
    canonical ||
    (typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}`
      : "");
  const metaImage = image || defaultImage;

  // Build Google Rich Snippet (Schema.org / BlogPosting or NewsArticle)
  const jsonLd =
    structuredData ||
    (article
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          },
          "headline": article.title || title,
          "description": metaDesc,
          "image": metaImage ? [metaImage] : [],
          "datePublished": article.publishedAt
            ? new Date(article.publishedAt).toISOString()
            : undefined,
          "dateModified": article.updatedAt
            ? new Date(article.updatedAt).toISOString()
            : article.publishedAt
            ? new Date(article.publishedAt).toISOString()
            : undefined,
          "author": {
            "@type": "Person",
            "name": article.author || siteName
          },
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "logo": {
              "@type": "ImageObject",
              "url":
                typeof window !== "undefined"
                  ? `${window.location.origin}/app-logo.png`
                  : "/app-logo.png"
            }
          }
        }
      : null);

  useEffect(() => {
    setPageMeta({
      title: fullTitle,
      description: metaDesc,
      siteName,
      image: metaImage,
      type,
      url: canonicalUrl,
      canonical: canonicalUrl,
      robots,
      twitterSite: twitterHandle,
      structuredData: jsonLd
    });
  }, [
    fullTitle,
    metaDesc,
    siteName,
    metaImage,
    type,
    canonicalUrl,
    robots,
    twitterHandle,
    jsonLd
  ]);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta name="robots" content={robots} />

      {/* Open Graph / Facebook / WhatsApp / LinkedIn */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {metaImage && <meta property="og:image" content={metaImage} />}

      {/* Twitter / X Cards */}
      <meta
        name="twitter:card"
        content={metaImage ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
      {twitterHandle && (
        <meta
          name="twitter:site"
          content={`@${twitterHandle.replace(/^@/, "")}`}
        />
      )}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </>
  );
};

export default SEO;
