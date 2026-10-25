import { 
  Briefcase, 
  FileText, 
  SearchCheck, 
  Share2, 
  Radio, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import { Link } from "react-router-dom";

const SERVICES_DATA = [
  {
    icon: SearchCheck,
    title: "Investigative Syndication",
    description: "License award-winning investigative exposés, datasets, and high-impact investigative reporting for print, television, and digital broadcast.",
    color: "bg-blue-50 text-blue-600 border-blue-200"
  },
  {
    icon: FileText,
    title: "Fact-Checking & Verification Desk",
    description: "Rapid editorial fact-checking, political claim verification, and digital forensic source authentication for organizations and media outlets.",
    color: "bg-amber-50 text-amber-600 border-amber-200"
  },
  {
    icon: Radio,
    title: "Special Press & News Wire",
    description: "Broadcast your press releases and corporate announcements across our verified subscriber network and syndication partners worldwide.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200"
  },
  {
    icon: ShieldCheck,
    title: "Secure Whistleblower Portal",
    description: "End-to-end encrypted conduits for confidential leaks, government accountability documents, and sensitive corporate disclosures.",
    color: "bg-rose-50 text-rose-600 border-rose-200"
  }
];

const ServicesSection = () => {
  return (
    <section 
      id="services" 
      data-section="services" 
      className="scroll-mt-28 py-16 bg-slate-900 text-white relative overflow-hidden"
    >
      {/* Background radial accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-3">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            Media & Newsroom Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-serif">
            Editorial Services & Partnerships
          </h2>
          <p className="mt-3 text-base text-slate-300">
            From syndicated investigative series to independent fact-checking and secure whistle-blower intake, Nsemfoa delivers premier journalistic integrity.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES_DATA.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/80 hover:border-amber-400/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-5 ${service.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
                  >
                    Inquire Service
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
