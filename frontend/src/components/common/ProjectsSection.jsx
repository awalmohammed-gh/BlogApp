import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FolderGit2, 
  Sparkles, 
  ArrowUpRight, 
  Layers, 
  Flame, 
  ExternalLink, 
  CheckCircle2 
} from "lucide-react";

const PROJECTS_DATA = [
  {
    id: "proj-1",
    title: "The Gold Coast Mining Ledger",
    subtitle: "Investigative Journalism & Data Audit",
    description: "An investigative audit tracking environmental compliance, local community compensation, and supply chain transparency across Ghana's mining basins.",
    category: "Investigative",
    badge: "Special Series",
    stats: "6 Months • 4 Regions",
    color: "from-amber-500/20 to-amber-900/40",
    border: "border-amber-500/30",
    accent: "text-amber-500",
    url: "/blog?category=investigative"
  },
  {
    id: "proj-2",
    title: "West Africa Tech Frontier",
    subtitle: "Fintech & Infrastructure Deep-Dive",
    description: "Mapping the rise of cross-border payment corridors, fintech innovation hubs, and venture capital flows reshaping commerce across Accra, Lagos, and Nairobi.",
    category: "Technology",
    badge: "Quarterly Report",
    stats: "24 Startups • $1.2B Analyzed",
    color: "from-blue-500/20 to-sky-900/40",
    border: "border-sky-500/30",
    accent: "text-sky-400",
    url: "/blog?category=business"
  },
  {
    id: "proj-3",
    title: "Climate & Cocoa Horizons",
    subtitle: "Agritech & Sustainable Supply",
    description: "Field reporting from Ghana and Côte d'Ivoire tracking rainfall variances, satellite deforestation tracking, and fair-trade farmer livelihoods.",
    category: "Environment",
    badge: "Multimedia Story",
    stats: "Interactive Maps & Drone Audits",
    color: "from-emerald-500/20 to-emerald-900/40",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    url: "/blog?category=features"
  }
];

const ProjectsSection = () => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredProjects = activeTab === "all" 
    ? PROJECTS_DATA 
    : PROJECTS_DATA.filter((p) => p.category.toLowerCase() === activeTab);

  return (
    <section 
      id="projects" 
      data-section="projects" 
      className="scroll-mt-28 py-16 bg-white border-y border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-3">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Special Projects & Deep-Dives
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight font-serif">
              Investigative Series & Special Coverage
            </h2>
            <p className="mt-3 text-base text-slate-600 max-w-2xl">
              Major editorial projects, investigative collaborations, and data journalism packages curated by the Nsemfoa newsroom.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="mt-6 md:mt-0 flex flex-wrap gap-2">
            {["all", "investigative", "technology", "environment"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? "bg-[#0B1B3A] text-white shadow-md shadow-slate-900/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {tab === "all" ? "All Projects" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl border border-slate-800"
            >
              {/* Top ambient aura */}
              <div className={`h-40 w-full bg-gradient-to-br ${project.color} p-6 flex flex-col justify-between relative overflow-hidden`}>
                <div className="flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-black/40 backdrop-blur-md text-white border border-white/10">
                    <Flame className="w-3 h-3 text-amber-400" />
                    {project.badge}
                  </span>
                  <span className="text-xs font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {project.category}
                  </span>
                </div>

                <div className="z-10">
                  <span className="text-xs font-medium text-slate-300">
                    {project.stats}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex-1 p-6 flex flex-col justify-between bg-slate-900 text-white">
                <div>
                  <h3 className="text-xl font-bold font-serif text-white group-hover:text-amber-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs font-medium text-amber-300/80 mt-1">
                    {project.subtitle}
                  </p>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    to={project.url}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white hover:text-amber-300 transition-colors"
                  >
                    Explore Series
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                  <span className="text-[11px] text-slate-500 font-medium">Nsemfoa Labs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
