import { engagementService } from "../services/public/engagementService";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useState, useEffect } from "react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  MessageSquare, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import blog28 from "../assets/blog28.jpg";
import { publicSiteContentService } from "../services/public/publicSiteContentService";

const Contact = () => {
  const { settings } = useSiteSettings();
  const [cmsSections, setCmsSections] = useState(null);

  useEffect(() => {
    let isMounted = true;
    publicSiteContentService.getPublishedPage("contact").then((res) => {
      if (isMounted && res?.success && res.data?.sections) {
        setCmsSections(res.data.sections);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const contactCms = cmsSections?.find((s) => s.type === "contact_info")?.data;

  const [formData, setFormData] = useState({
    website: "",
    name: "",
    email: "",
    subject: "",
    department: "newsroom",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact details come from the Website CMS contact page or General Settings only.
  const contactCards = [
    {
      icon: Mail,
      title: "Newsroom & Editorial Tips",
      primary: contactCms?.primaryEmail || settings?.general.contactEmail || "",
      secondary: contactCms?.secondaryEmail || "",
      note: "Leads & press releases"
    },
    {
      icon: Phone,
      title: "Phone",
      primary: contactCms?.primaryPhone || settings?.general.contactPhone || "",
      secondary: contactCms?.secondaryPhone || "",
      note: contactCms?.hours || ""
    },
    {
      icon: MapPin,
      title: "Address",
      primary: contactCms?.address || settings?.general.address || "",
      secondary: "",
      note: ""
    }
  ].filter((card) => card.primary);

  const faqs = [
    {
      q: "How can I submit a confidential news tip or leak?",
      a: "Use the form on this page or the newsroom email listed above, and mark your subject line as 'CONFIDENTIAL TIP'. Our investigative desk respects reporter-source confidentiality under Ghana's journalistic code of ethics."
    },
    {
      q: "How do I advertise or sponsor content on Nsemra News?",
      a: "Select 'Advertising & Brand Partnerships' in the contact form and our commercial desk will get back to you."
    },
    {
      q: "What is your policy regarding factual corrections?",
      a: "We strive for 100% accuracy. If you notice any factual discrepancy in any story, submit a message choosing 'Editorial Correction' with the article link, and our editors will review and update within hours."
    },
    {
      q: "Can other publications syndicate or quote Nsemra News articles?",
      a: "Content may be quoted with clear hyperlinked attribution to Nsemra News. For full syndication rights, contact us through the form on this page."
    }
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await engagementService.contact(formData);
      toast.success(response.message);
      setFormData({ name: "", email: "", subject: "", department: "newsroom", message: "", website: "" });
    } catch (err) { toast.error(err.message || "Unable to submit your message. Please try again."); }
    finally { setIsSubmitting(false); }

  };

  return (
    <div className="min-h-screen bg-white">
      {/* =========================================================================
          HERO MASTHEAD BANNER (Cohesive with Landing Page Navy Palette)
         ========================================================================= */}
      <section className="relative w-full pt-32 sm:pt-36 md:pt-40 pb-16 overflow-hidden">
        {/* Communications Desk Banner Background Image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={blog28}
            alt="Nsemra News Communications Bureau"
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>

        {/* Deep Editorial Overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/92 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/30 to-[#07132B]/85 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center text-white z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md mb-4 text-xs font-semibold uppercase tracking-widest text-blue-200">
            <MessageSquare className="w-3.5 h-3.5 text-blue-300" />
            <span>Editorial Communications & Press Office</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-serif-headline tracking-tight text-white mb-4">
            Contact the Nsemra News Newsroom
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed font-light mb-8">
            Submit confidential news tips, reach bureau correspondents, propose editorial corrections, or discuss advertising partnerships.
          </p>

        </div>
      </section>

      {/* Main Grid: Info Cards + Form */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] bg-blue-50 px-3 py-1 rounded-full">
                Reach Out Directly
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 tracking-tight">
                Our Communication Channels
              </h2>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                Connect directly with the responsible desk for faster resolution and response.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 pt-2">
              {contactCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx}
                    className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xs hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{card.title}</h3>
                        <p className="text-[#1E3A8A] font-medium text-sm mt-0.5">{card.primary}</p>
                        {card.secondary && <p className="text-gray-600 text-xs mt-0.5">{card.secondary}</p>}
                        {card.note && <p className="text-gray-400 text-xs mt-1.5">{card.note}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl">
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Send Us a Direct Message
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Fill in the fields below and our relevant department will respond within 24 hours.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" name="website" value={formData.website} onChange={handleChange} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      maxLength={100} value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Kwame Mensah"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      maxLength={254} value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. kwame@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      maxLength={200} value={formData.subject}
                      onChange={handleChange}
                      placeholder="Headline or topic summary"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all bg-white"
                    >
                      <option value="newsroom">Newsroom / Editorial Tip</option>
                      <option value="advertising">Advertising & Sponsorships</option>
                      <option value="correction">Editorial Correction</option>
                      <option value="press">Press & Media Enquiries</option>
                      <option value="general">General Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    name="message"
                    maxLength={5000} value={formData.message}
                    onChange={handleChange}
                    placeholder="Provide full details, story lead, or inquiry..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-linear-to-r from-[#1E3A8A] to-[#2E4A9A] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Send size={16} />
                  {isSubmitting ? "Sending..." : "Submit Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] bg-blue-100 px-3 py-1 rounded-full">
              Reader Inquiries
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Find quick answers about tipping, editorial transparency, and commercial inquiries.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{faq.q}</h3>
                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
