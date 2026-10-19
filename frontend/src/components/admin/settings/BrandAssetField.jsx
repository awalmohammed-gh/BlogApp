import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Upload, Images, Trash2, Loader2, ImageOff, AlertTriangle } from "lucide-react";
import mediaService from "../../../services/admin/mediaService";
import MediaPickerModal from "../common/MediaPickerModal";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Logo / favicon picker for Settings -> Branding. Images are uploaded to (or chosen
 * from) the Media Library "Branding" folder; the value is { url, mediaId }.
 * The public site only changes when the Branding section is saved.
 */
export default function BrandAssetField({ id, label, description, hint, value, onChange, square = false, previewClassName = "", altText }) {
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notSquare, setNotSquare] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a PNG, JPG, WebP, GIF or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const res = await mediaService.uploadSingle(file, {
        folder: "branding",
        name: `${label} - ${file.name.replace(/\.[^.]+$/, "")}`.slice(0, 150),
        altText
      });
      if (!res?.success || !res.data?.url) throw new Error(res?.message || "Upload failed");
      setBroken(false);
      onChange({ url: res.data.url, mediaId: res.data._id });
      toast.success(`${label} uploaded. Save to apply it to the site.`);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="grid sm:grid-cols-[9rem_minmax(0,1fr)] gap-4 items-start">
      <div
        className={`relative flex items-center justify-center rounded-2xl border border-slate-200 overflow-hidden ${square ? "w-24 h-24" : "w-36 h-24"} ${previewClassName}`}
        style={{ backgroundImage: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)", backgroundSize: "16px 16px" }}
      >
        {value.url && !broken ? (
          <img
            src={value.url}
            alt={`${label} preview`}
            className={`max-w-[85%] max-h-[85%] object-contain ${square ? "w-16 h-16" : ""}`}
            onError={() => setBroken(true)}
            onLoad={(e) => setNotSquare(square && Math.abs(e.currentTarget.naturalWidth - e.currentTarget.naturalHeight) > 2)}
          />
        ) : value.url && broken ? (
          <span className="flex flex-col items-center gap-1 text-xs text-rose-600"><ImageOff size={20} /> Unavailable</span>
        ) : (
          <span className="text-xs text-slate-400 text-center px-2">No {label.toLowerCase()}</span>
        )}
        {uploading && (
          <span className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-blue-600" /></span>
        )}
      </div>

      <div className="space-y-2.5">
        <div>
          <span id={`${id}-label`} className="block text-sm font-semibold text-slate-800">{label}</span>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
          <input ref={fileInput} id={id} type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} aria-label={`Upload ${label.toLowerCase()}`} />
          <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            <Upload size={14} /> {value.url ? "Replace" : "Upload"}
          </button>
          <button type="button" disabled={uploading} onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            <Images size={14} /> Choose from library
          </button>
          {value.url && (
            <button type="button" disabled={uploading} onClick={() => { setBroken(false); setNotSquare(false); onChange({ url: "", mediaId: "" }); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">{hint}</p>
        {notSquare && (
          <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> This image isn&apos;t square, so browsers may squash it. A square image works best.</p>
        )}
      </div>

      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`Choose ${label.toLowerCase()}`}
        defaultFolder="branding"
        selectedUrl={value.url}
        onSelect={(url, meta) => {
          setBroken(false);
          onChange({ url, mediaId: meta?._id || meta?.mediaId || "" });
        }}
      />
    </div>
  );
}
