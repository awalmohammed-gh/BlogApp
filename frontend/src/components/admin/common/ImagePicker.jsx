import { useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  RefreshCw,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import MediaPickerModal from "./MediaPickerModal";
import mediaService from "../../../services/admin/mediaService";

export const ImagePicker = ({
  value,
  onChange,
  onUploadStateChange,
  variant = "default",
  label = "Featured Image",
  helpText = "Recommended: 16:9 ratio (1920x1080), max 5MB (JPG, PNG, WebP)",
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
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large (Maximum 5MB allowed)");
      return;
    }

    try {
      setIsUploading(true);
      onUploadStateChange?.(true);
      toast.loading("Uploading your image…", { id: "imagekit-upload" });

      const res = await mediaService.uploadSingle(file, {
        folder: "articles-featured",
        name: file.name.replace(/\.[^/.]+$/, ""),
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
          alt: res.data.altText || "",
        });
        toast.success("Image added to your media library.", { id: "imagekit-upload" });
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("ImageKit upload error:", err);
      toast.error(err.message || "Failed to upload image to ImageKit", { id: "imagekit-upload" });
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("", { url: "", mediaId: null, media: null, fileId: "" });
  };

  const handleApplyUrl = () => {
    if (!customUrl.trim()) return;
    try {
      const url = new URL(customUrl.trim());
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid protocol");
    } catch {
      toast.error("Enter a complete image URL starting with https:// or http://.");
      return;
    }
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
      alt: metadata.alt || metadata.altText || "",
    });
  };

  if (variant === "editor")
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload cover image"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        {imageUrl ? (
          <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={imageUrl}
              alt="Article cover preview"
              className="h-full w-full object-cover"
            />
            {isUploading && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/60 text-xs text-white"
              >
                <Loader2 size={18} className="animate-spin" />
                Uploading image…
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setShowMediaModal(true)}
            className="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-gradient-to-b from-blue-50/60 to-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-white text-blue-500 shadow-xs">
              {isUploading ? (
                <Loader2 size={21} className="animate-spin" />
              ) : (
                <ImageIcon size={21} />
              )}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {isUploading ? "Uploading your image…" : "Give your story a cover"}
            </span>
            <span className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              {isUploading
                ? "Your image will appear here shortly."
                : "Choose a photo from the media library."}
            </span>
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
          >
            <UploadCloud size={13} />
            {imageUrl ? "Replace" : "Upload image"}
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setShowMediaModal(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
          >
            <ImageIcon size={12} />
            Library
          </button>
          {imageUrl && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleRemove}
              aria-label="Remove cover image"
              className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] text-slate-400">JPG, PNG or WebP · Max 5 MB</p>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setShowUrlInput((open) => !open)}
            aria-expanded={showUrlInput}
            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600"
          >
            <LinkIcon size={10} />
            Use a URL
          </button>
        </div>
        {showUrlInput && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <label
              htmlFor="article-cover-url"
              className="block text-[11px] font-medium text-slate-600"
            >
              Image URL
            </label>
            <input
              id="article-cover-url"
              type="url"
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="https://…"
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="w-full rounded-lg bg-blue-600 py-2 text-[11px] font-semibold text-white hover:bg-blue-700"
            >
              Apply image
            </button>
          </div>
        )}
        <MediaPickerModal
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          onSelect={handleMediaModalSelect}
          selectedUrl={imageUrl}
          title="Select cover image"
          defaultFolder="articles-featured"
        />
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
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
              <p className="text-xs font-semibold text-slate-800">Uploading to ImageKit CDN...</p>
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
