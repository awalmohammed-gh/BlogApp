import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Search,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  Folder,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import mediaService from "../../../services/admin/mediaService";

const FOLDER_OPTIONS = [
  { key: "all", label: "All Folders" },
  { key: "articles-featured", label: "Articles / Featured" },
  { key: "articles-content", label: "Articles / Content" },
  { key: "general", label: "General Media" }
];

export const MediaPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  selectedUrl = "",
  title = "Select Image from Media Library",
  defaultFolder = "all"
}) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState(defaultFolder);
  const [activeTab, setActiveTab] = useState("library"); // 'library' | 'upload'
  const [altOverride, setAltOverride] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Upload tab state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadFolder, setUploadFolder] = useState(
    defaultFolder !== "all" ? defaultFolder : "articles-featured"
  );
  const uploadInputRef = useRef(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await mediaService.getMedia({
        page: 1,
        limit: 48,
        search,
        folder: folder !== "all" ? folder : undefined,
        status: "active",
        sortBy: "createdAt",
        sortOrder: "desc"
      });
      if (res?.success) {
        setMediaItems(res.data || []);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedItem(null);
      setAltOverride("");
      setActiveTab("library");
    }
  }, [isOpen, folder, search]);

  if (!isOpen) return null;

  const handleSelectConfirm = () => {
    if (!selectedItem) return;
    onSelect(selectedItem.url, {
      ...selectedItem,
      mediaId: selectedItem._id,
      media: selectedItem._id,
      alt: altOverride || selectedItem.altText || selectedItem.name
    });
    onClose();
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds maximum 5MB limit");
      return;
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setUploadAlt(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      const res = await mediaService.uploadSingle(
        uploadFile,
        {
          folder: uploadFolder,
          altText: uploadAlt,
          name: uploadFile.name.replace(/\.[^/.]+$/, "")
        },
        (p) => setUploadProgress(p)
      );

      if (res?.success && res.data) {
        toast.success("Image uploaded to ImageKit and added to library!");
        onSelect(res.data.url, {
          ...res.data,
          mediaId: res.data._id,
          media: res.data._id,
          alt: uploadAlt || res.data.altText
        });
        onClose();
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an existing asset or upload directly to ImageKit CDN.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-slate-100 bg-white">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "library"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Browse Media Library
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "upload"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Upload New Image
            </button>
          </div>

          {activeTab === "library" && (
            <button
              type="button"
              onClick={fetchMedia}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "library" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter Controls */}
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or alt text..."
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Folder size={14} className="text-slate-400" />
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {FOLDER_OPTIONS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid & Sidebar Layout */}
            <div className="flex-1 flex min-h-0">
              {/* Media Grid */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-blue-600" />
                    <span className="text-xs">Loading media assets...</span>
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon size={32} />
                    <span className="text-xs">No media assets found matching the criteria.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {mediaItems.map((item) => {
                      const isSelected = selectedItem?._id === item._id || selectedUrl === item.url;
                      return (
                        <div
                          key={item._id}
                          onClick={() => {
                            setSelectedItem(item);
                            setAltOverride(item.altText || "");
                          }}
                          className={`group relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-slate-900 ${
                            isSelected
                              ? "border-blue-600 ring-3 ring-blue-500/30"
                              : "border-slate-200 hover:border-blue-400"
                          }`}
                        >
                          <img
                            src={item.thumbnailUrl || item.url}
                            alt={item.altText || item.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-103"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white rounded-full p-1 shadow">
                              <Check size={12} />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-1.5 pt-4 text-white text-[10px] truncate">
                            <span className="font-semibold block truncate">{item.name}</span>
                            <span className="text-[9px] text-slate-300">
                              {mediaService.formatBytes(item.size)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selection sidebar preview */}
              {selectedItem && (
                <div className="w-72 border-l border-slate-100 p-4 bg-slate-50/50 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                  <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900 truncate">{selectedItem.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedItem.width && selectedItem.height
                        ? `${selectedItem.width} × ${selectedItem.height} px • `
                        : ""}
                      {mediaService.formatBytes(selectedItem.size)}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">
                      {selectedItem.mimeType?.replace("image/", "")}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Alt Text for this usage:
                    </label>
                    <textarea
                      rows={2}
                      value={altOverride}
                      onChange={(e) => setAltOverride(e.target.value)}
                      placeholder="Descriptive alt text for accessibility..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Upload Tab */
          <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePicked}
              className="hidden"
            />

            {!uploadFile ? (
              <div
                onClick={() => uploadInputRef.current?.click()}
                className="w-full max-w-lg border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-10 text-center cursor-pointer transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Select an image to upload
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: JPEG, PNG, WebP (Max: 5MB)
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="w-full max-w-lg bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img
                    src={uploadPreview}
                    alt="Upload Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreview("");
                    }}
                    className="absolute top-2 right-2 p-1 bg-slate-950/70 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Alt Text (Accessibility)
                    </label>
                    <input
                      type="text"
                      value={uploadAlt}
                      onChange={(e) => setUploadAlt(e.target.value)}
                      placeholder="Descriptive text..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Folder
                    </label>
                    <select
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="articles-featured">Articles / Featured</option>
                      <option value="articles-content">Articles / Content</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Uploading to ImageKit...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreview("");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleUploadSubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        <span>Upload & Select</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        {activeTab === "library" && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-white">
            <span className="text-xs text-slate-500 truncate">
              {selectedItem
                ? `Selected: ${selectedItem.name}`
                : "Select an image from the library above"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedItem}
                onClick={handleSelectConfirm}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Choose Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPickerModal;
