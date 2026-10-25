import { useState } from "react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare,
  Lock
} from "lucide-react";
import { engagementService } from "../../services/public/engagementService";
import toast from "../../utils/toast";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "newsroom",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await engagementService.submitContactEnquiry({
        ...formData,
        subject: `[Homepage Quick Contact] ${formData.department.toUpperCase()}`
      });
      if (res?.success) {
        setSubmitted(true);
        toast.success("Thank you! Your message has been received by our newsroom desk.");
        setFormData({ name: "", email: "", department: "newsroom", message: "" });
      } else {
        toast.error(res?.message || "Could not submit your enquiry. Please try again.");
      }
    } catch (err) {
      console.error("Contact submission error:", err);
      toast.error("An unexpected error occurred while sending your message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section 
      id="contact" 
      data-section="contact" 
      className="scroll-mt-28 py-16 bg-slate-50 border-t border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Editorial Tips & Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-200/60">
              <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
              Direct Newsroom Contact
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B3A] tracking-tight font-serif">
              Contact Us & Send News Tips
            </h2>

            <p className="text-base text-slate-600 leading-relaxed">
              Have a confidential news tip, pitch, correction, or general inquiry? Our journalists and editorial team evaluate submissions with strict source confidentiality.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Newsroom Inquiries</h4>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">newsroom@nsemfoanews.com</p>
                  <p className="text-xs text-slate-500">Fast response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone & Editorial Line</h4>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">+233 (0) 30 200 4500</p>
                  <p className="text-xs text-slate-500">Mon - Fri: 8:00 AM - 6:00 PM GMT</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md">
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">Confidential Whistleblower Desk</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Source confidentiality is protected under international journalistic protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Contact Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 shadow-xl shadow-slate-200/50">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 font-serif">Message Dispatched!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you for reaching out. Our editorial desk has logged your correspondence and will review it promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#0B1B3A] text-white hover:bg-slate-800 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold text-[#0B1B3A] font-serif">
                  Send a Direct Message
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Kwame Mensah"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@domain.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Department / Topic
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="newsroom">Newsroom Editorial Desk</option>
                    <option value="tips">Investigative News Tip</option>
                    <option value="services">Services & Syndication Partnership</option>
                    <option value="advertising">Sponsorship & Advertising</option>
                    <option value="general">General Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Message / Story Pitch <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your news lead, inquiry, or question in detail..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-[#0B1B3A] hover:bg-slate-800 disabled:opacity-60 transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Message...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Transmit Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
