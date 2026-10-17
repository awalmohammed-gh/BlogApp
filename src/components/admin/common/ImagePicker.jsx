import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Loader2, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";
import MediaPickerModal from "./MediaPickerModal";
import mediaService from "../../../services/admin/mediaService";

export const ImagePicker = ({
  value,
  onChange,
  label = "Featured Image",
  helpText = "Recommended: 16:9 ratio (1920x1080), max 5MB (JPG, PNG, WebP)"
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Normalize value: handles object ({ url, media, fileId }) or legacy string URL
  const imageUrl = typeof value === "object" && value !== null ? value.url : value || "";

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large (Maximum 5MB allowed)");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("Uploading to ImageKit CDN...", { id: "imagekit-upload" });

      const res = await mediaService.uploadSingle(file, {
        folder: "articles-featured",
        name: file.name.replace(/\.[^/.]+$/, "")
      });

      if (res?.success && res.data?.url) {
        onChange(res.data.url, {
          mediaId: res.data._id,
          media: res.data._id,
          fileId: res.data.fileId,
          url: res.data.url,
          name: res.data.name,
          width: res.data.width,
          height: res.data.height,
          alt: res.data.altText || ""
        });
        toast.success("Image uploaded to ImageKit and saved to library!", { id: "imagekit-upload" });
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("ImageKit upload error:", err);
      toast.error(err.message || "Failed to upload image to ImageKit", { id: "imagekit-upload" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("", { url: "", mediaId: null, media: null, fileId: "" });
  };

  const handleApplyUrl = () => {
    if (!customUrl.trim()) return;
    onChange(customUrl.trim(), { url: customUrl.trim(), name: "External Image" });
    setCustomUrl("");
    setShowUrlInput(false);
    toast.success("Image URL applied");
  };

  const handleMediaModalSelect = (url, metadata) => {
    onChange(url, {
      url,
      mediaId: metadata._id || metadata.mediaId || null,
      media: metadata._id || metadata.media || null,
      fileId: metadata.fileId || "",
      name: metadata.name || "",
      width: metadata.width || null,
      height: metadata.height || null,
      alt: metadata.alt || metadata.altText || ""
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
        {imageUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMediaModal(true)}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon size={12} /> Media Library
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isUploading ? "animate-spin" : ""} /> Upload New
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
          {isUploading ? (
            <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <span className="text-xs font-medium">Uploading to ImageKit...</span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold shadow-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Change from Library
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {isUploading ? (
            <div className="border-2 border-dashed border-blue-400 bg-blue-50/40 rounded-xl p-8 text-center">
              <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Uploading to ImageKit CDN...
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Registering in media library...</p>
            </div>
          ) : (
            <div
              onClick={() => setShowMediaModal(true)}
              className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition-colors"
            >
              <div className="mx-auto w-10 h-10 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mb-2">
                <ImageIcon size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Choose Image from Media Library
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{helpText}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
            >
              <UploadCloud size={13} /> Upload Directly
            </button>
            <span className="text-[11px] text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon size={12} /> Add by URL
            </button>
          </div>

          {showUrlInput && (
            <div className="flex gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={handleMediaModalSelect}
        selectedUrl={imageUrl}
        title="Select Featured Image"
        defaultFolder="articles-featured"
      />
    </div>
  );
};

export default ImagePicker;
