import { responsiveImageProps } from "../../utils/imageKit";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Clock, TrendingUp, ShieldCheck, Newspaper, Star } from "lucide-react";
import { useBlog } from "../../context/BlogProvider";
import BlogCard from "../card/BlogCard";
import { stripHtml, readingMinutes, deskCounts, hideBrokenImage } from "../../utils/articleMeta";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const SectionHeading = ({ id, eyebrow, title, to, linkLabel, dark = false }) => (
  <div className="flex items-end justify-between gap-4 mb-8">
    <div>
      <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-sky-300" : "text-blue-600"}`}>{eyebrow}</span>
      <h2 id={id} className={`mt-1.5 font-serif-headline text-3xl sm:text-4xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
    </div>
    {to && (
      <Link
        to={to}
        className={`group shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold ${dark ? "text-sky-300 hover:text-white" : "text-blue-700 hover:text-blue-900"}`}
      >
        <span className="hidden sm:inline">{linkLabel}</span>
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    )}
  </div>
);

const Byline = ({ story, light = false }) => (
  <div className={`flex items-center gap-2 text-xs ${light ? "text-slate-200" : "text-slate-500"}`}>
    {story.author && (
      <>
        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${light ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"}`}>
          {story.author.charAt(0)}
        </span>
        <span className={`font-medium truncate ${light ? "text-white" : "text-slate-700"}`}>{story.author}</span>
        <span aria-hidden="true">&middot;</span>
      </>
    )}
    <span className="shrink-0">{story.date}</span>
    <span aria-hidden="true">&middot;</span>
    <span className="shrink-0 inline-flex items-center gap-1">
      <Clock size={12} /> {(story.readingMinutes || readingMinutes(story.content))} min read
    </span>
  </div>
);

const RecentArticles = () => {
  const { articles, loading, error, refreshArticles } = useBlog();



  const published = useMemo(() => (articles || []).filter((b) => b.isPublished === true), [articles]);

  // Each story appears once on the page, in this order of sections.
  const sections = useMemo(() => {
    const used = new Set();
    const take = (list, n) => {
      const picked = list.filter((b) => !used.has(b._id)).slice(0, n);
      picked.forEach((b) => used.add(b._id));
      return picked;
    };
    const [lead, ...secondary] = take(published, 4);
    const featured = take(published.filter((b) => b.isFeatured), 3);
    const latest = take(published, 6);
    const more = take(published, 5);
    return { lead, secondary, featured, latest, more };
  }, [published]);

  const desks = useMemo(() => deskCounts(published).slice(0, 8), [published]);
  const mostRead = useMemo(
    () => [...published].filter((b) => Number(b.views) > 0).sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 5),
    [published]
  );

  if (loading && published.length === 0) {
    return (
      <div className="grid lg:grid-cols-12 gap-6 animate-pulse" aria-label="Loading stories">
        <div className="lg:col-span-7 h-105 rounded-3xl bg-slate-200/70" />
        <div className="lg:col-span-5 space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-200/70" />)}
        </div>
      </div>
    );
  }

  if (error && !published.length) return <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p>Stories could not be loaded. Please check your connection.</p><button onClick={refreshArticles} className="mt-4 text-blue-700 underline">Try again</button></div>;

  if (published.length === 0) {
    return (
      <div className="py-20 px-6 text-center bg-white rounded-3xl border border-slate-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Newspaper className="w-7 h-7" />
        </div>
        <h3 className="font-serif-headline text-2xl font-bold text-slate-900">No stories published yet</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
          The newsroom hasn't published its first story. Check back soon, or subscribe below to hear when it does.
        </p>
      </div>
    );
  }

  const { lead, secondary, featured, latest, more } = sections;

  return (
    <div className="space-y-24">
      {/* ===== Top stories ===== */}
      <motion.section {...reveal} aria-labelledby="top-stories">
        <SectionHeading id="top-stories" eyebrow="Today on Nsemfoa News" title="Top Stories" to="/blog" linkLabel="All stories" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Link
            to={`/blog-details/${lead._id}`}
            className={`group relative overflow-hidden rounded-3xl bg-slate-900 min-h-95 sm:min-h-115 flex items-end ${secondary.length ? "lg:col-span-7" : "lg:col-span-12"}`}
          >
            <img
              onError={hideBrokenImage}
              {...responsiveImageProps(lead.image, {width:960})}
              width={960}
              height={540}
              alt={lead.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-slate-950/5" />
            <div className="relative p-6 sm:p-9 space-y-4 max-w-2xl">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-400/20 border border-sky-300/30 text-sky-100 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md">
                {lead.isBreaking ? "Breaking" : "Lead story"} &middot; {lead.category}
              </span>
              <h3 className="font-serif-headline text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] tracking-tight">
                {lead.title}
              </h3>
              {lead.description && <p className="text-sm sm:text-base text-slate-300 line-clamp-2 leading-relaxed">{stripHtml(lead.description)}</p>}
              <Byline story={lead} light />
            </div>
          </Link>

          {secondary.length > 0 && (
            <div className="lg:col-span-5 flex flex-col gap-4">
              {secondary.map((story) => (
                <Link
                  key={story._id}
                  to={`/blog-details/${story._id}`}
                  className="group flex-1 flex gap-4 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 transition-all"
                >
                  <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                    <img onError={hideBrokenImage} {...responsiveImageProps(story.image, {width:640})} width={320} height={200} alt={story.title} className="w-full h-full min-h-24 object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center gap-1.5 py-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{story.category}</span>
                    <h4 className="font-serif-headline text-lg font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {story.title}
                    </h4>
                    <span className="text-xs text-slate-500">{story.date} &middot; {(story.readingMinutes || readingMinutes(story.content))} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ===== Latest stories ===== */}
      {latest.length > 0 && (
        <motion.section {...reveal} aria-label="Latest stories">
          <SectionHeading eyebrow="Fresh from the newsroom" title="Latest Stories" to="/blog" linkLabel="Browse the archive" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.map((story) => <BlogCard key={story._id} blog={story} />)}
          </div>
        </motion.section>
      )}

      {/* ===== Explore by desk ===== */}
      {desks.length > 0 && (
        <motion.section {...reveal} aria-label="Explore by desk">
          <SectionHeading eyebrow="Find your beat" title="Explore by Desk" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {desks.map((desk) => (
              <Link
                key={desk.slug}
                to={`/${desk.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-4/3 bg-slate-900"
              >
                <img onError={hideBrokenImage} src={desk.image} alt="" loading="lazy" decoding="async" width={400} height={300} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-base sm:text-lg truncate">{desk.name}</h3>
                    <span className="text-xs text-slate-300">{desk.count} {desk.count === 1 ? "story" : "stories"}</span>
                  </div>
                  <span className="w-8 h-8 shrink-0 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* ===== Editor's choice (only stories marked as featured) ===== */}
      {featured.length > 0 && (
        <motion.section {...reveal} className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 rounded-none sm:rounded-3xl bg-[#050B1F] overflow-hidden">
          <div className="absolute inset-0 hero-starfield opacity-60 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-500/20 blur-[100px] pointer-events-none" />
          <div className="relative">
            <SectionHeading eyebrow="Curated by our editors" title="Editor's Choice" dark />
            <div className={`grid grid-cols-1 gap-6 ${featured.length === 1 ? "md:max-w-xl" : featured.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {featured.map((story) => (
                <Link
                  key={story._id}
                  to={`/blog-details/${story._id}`}
                  className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-sky-300/40 hover:bg-white/10 transition-all"
                >
                  <div className="aspect-16/10 overflow-hidden">
                    <img onError={hideBrokenImage} {...responsiveImageProps(story.image, {width:640})} width={640} height={400} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                      <Star size={12} className="fill-sky-300" /> {story.category}
                    </span>
                    <h3 className="font-serif-headline text-xl font-bold text-white leading-snug line-clamp-2">{story.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2">{stripHtml(story.description)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ===== More stories + Most read ===== */}
      <motion.section {...reveal} className={more.length > 0 ? "grid grid-cols-1 lg:grid-cols-12 gap-10" : ""} aria-label="More stories">
        {more.length > 0 && (
        <div className="lg:col-span-8">
            <>
              <SectionHeading eyebrow="Keep reading" title="More Stories" />
              <div className="divide-y divide-slate-200">
                {more.map((story) => (
                  <Link key={story._id} to={`/blog-details/${story._id}`} className="group flex gap-5 py-6 first:pt-0">
                    <div className="flex-1 min-w-0 space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{story.category}</span>
                      <h3 className="font-serif-headline text-xl sm:text-2xl font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                        {story.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 hidden sm:block">{stripHtml(story.description)}</p>
                      <Byline story={story} />
                    </div>
                    <div className="w-24 h-24 sm:w-40 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                      <img onError={hideBrokenImage} {...responsiveImageProps(story.image, {width:640})} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          <Link
            to="/blog"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Browse all stories <ArrowRight size={16} />
          </Link>
        </div>
        )}

        <aside className={more.length > 0 ? "lg:col-span-4 space-y-6" : "grid grid-cols-1 md:grid-cols-2 gap-6 items-start"}>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 mb-5">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Most Read
            </h3>
            {mostRead.length === 0 ? (
              <p className="text-sm text-slate-500">Rankings appear once stories have recorded views.</p>
            ) : (
              <ol className="space-y-5">
                {mostRead.map((story, idx) => (
                  <li key={story._id}>
                    <Link to={`/blog-details/${story._id}`} className="group flex gap-4 items-start">
                      <span className="font-serif-headline text-3xl font-bold leading-none text-transparent bg-clip-text bg-linear-to-b from-sky-400 to-blue-700 w-8 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{story.category}</span>
                        <span className="block text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">{story.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl p-6 text-white bg-linear-to-br from-[#0B1B3D] to-[#123B7A] space-y-3">
            <ShieldCheck className="w-7 h-7 text-sky-300" />
            <h3 className="font-serif-headline text-xl font-bold">Our editorial standards</h3>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Every story is reviewed by an editor before publication, and corrections are made openly.
            </p>
            <Link to="/about" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-300 hover:text-white">
              About Nsemra News <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </motion.section>
    </div>
  );
};

export default RecentArticles;
