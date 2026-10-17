import { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
  Eye,
  RemoveFormatting
} from "lucide-react";
import toast from "react-hot-toast";
import articleService from "../../../services/admin/articleService";
import MediaPickerModal from "./MediaPickerModal";

export const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Write your detailed news report or article content here..."
}) => {
  const editorRef = useRef(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const isUpdatingRef = useRef(false);

  // Sync value from props into editor innerHTML when not focused
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    setSourceCode(value || "");
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    setSourceCode(html);
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 50);
  };

  const executeCommand = (command, val = null) => {
    if (isSourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleHeading = (tag) => {
    if (isSourceMode) return;
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, `<${tag}>`);
    handleInput();
  };

  const imageFileInputRef = useRef(null);

  const handleInsertLink = () => {
    if (isSourceMode) return;
    const url = prompt("Enter the destination URL (e.g. https://...):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    try {
      toast.loading("Uploading inline image to ImageKit...", { id: "editor-image-upload" });
      const res = await articleService.uploadArticleImage(file);
      if (res?.success && res.data?.url) {
        editorRef.current?.focus();
        document.execCommand("insertImage", false, res.data.url);
        handleInput();
        toast.success("Image uploaded & inserted", { id: "editor-image-upload" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload image", { id: "editor-image-upload" });
    } finally {
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    }
  };

  const handleInsertImage = () => {
    if (isSourceMode) return;
    setShowMediaPicker(true);
  };

  const handleMediaPickerSelect = (url, metadata) => {
    editorRef.current?.focus();
    const alt = metadata.alt || metadata.altText || metadata.name || "";
    // Insert structured HTML image with responsive attributes
    const imgHtml = `<figure class="my-4"><img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" class="rounded-xl w-full max-h-[500px] object-cover" />${
      metadata.caption ? `<figcaption class="text-xs text-slate-500 mt-1 italic">${metadata.caption}</figcaption>` : ""
    }</figure><p></p>`;
    document.execCommand("insertHTML", false, imgHtml);
    handleInput();
    toast.success("Image inserted into article");
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching from source to visual
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceCode;
      }
      onChange(sourceCode);
      setIsSourceMode(false);
    } else {
      // Switching from visual to source
      setSourceCode(editorRef.current?.innerHTML || "");
      setIsSourceMode(true);
    }
  };

  const handleSourceChange = (e) => {
    const newCode = e.target.value;
    setSourceCode(newCode);
    onChange(newCode);
  };

  // Metrics
  const plainText = (value || "").replace(/<[^>]*>?/gm, " ").trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const charCount = plainText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="border border-slate-300 rounded-xl bg-white shadow-xs overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => executeCommand("undo")}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("redo")}
          title="Redo (Ctrl+Y)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Redo size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => handleHeading("h2")}
          title="Heading 2"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded font-bold text-xs flex items-center transition-colors cursor-pointer"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleHeading("h3")}
          title="Heading 3"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded font-bold text-xs flex items-center transition-colors cursor-pointer"
        >
          <Heading3 size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleHeading("p")}
          title="Paragraph text"
          className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded font-semibold text-xs transition-colors cursor-pointer"
        >
          ¶
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("bold")}
          title="Bold (Ctrl+B)"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          title="Italic (Ctrl+I)"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          title="Underline (Ctrl+U)"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Underline size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          title="Bullet List"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          title="Numbered List"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<blockquote>")}
          title="Blockquote"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <Quote size={15} />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={handleInsertLink}
          title="Insert Link"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <LinkIcon size={15} />
        </button>
        <button
          type="button"
          onClick={handleInsertImage}
          title="Insert Web Image"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          title="Clear formatting"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
        >
          <RemoveFormatting size={15} />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSourceMode}
            title={isSourceMode ? "Visual Editor" : "Inspect HTML Source"}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
              isSourceMode
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isSourceMode ? <Eye size={13} /> : <Code size={13} />}
            <span>{isSourceMode ? "Visual" : "HTML"}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {isSourceMode ? (
        <textarea
          value={sourceCode}
          onChange={handleSourceChange}
          className="w-full min-h-[360px] p-4 font-mono text-xs text-slate-800 bg-slate-900 text-emerald-400 focus:outline-none resize-y"
          placeholder="Enter raw HTML code here..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="min-h-[360px] p-5 text-slate-800 focus:outline-none prose prose-slate max-w-none prose-h2:text-xl prose-h2:font-bold prose-h2:text-slate-900 prose-h3:text-lg prose-h3:font-semibold prose-p:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 prose-ul:list-disc prose-ol:list-decimal"
          data-placeholder={placeholder}
        />
      )}

      {/* Editorial Footer Metrics */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            Words: <strong className="font-semibold text-slate-700">{wordCount}</strong>
          </span>
          <span>
            Characters: <strong className="font-semibold text-slate-700">{charCount}</strong>
          </span>
          <span>
            Est. Reading: <strong className="font-semibold text-slate-700">{readingTime} min</strong>
          </span>
        </div>
        <div className="text-slate-400 italic">
          NewsFront Semantic Editorial Standard
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaPickerSelect}
        title="Insert Image into Article Content"
        defaultFolder="articles-content"
      />
    </div>
  );
};

export default RichTextEditor;
