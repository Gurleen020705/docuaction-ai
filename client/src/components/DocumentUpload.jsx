import { useState, useRef } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const ACCEPTED_EXT = [".pdf", ".doc", ".docx", ".txt"];

const DocumentUpload = ({ onUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const validateAndUpload = async (file) => {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Max size is 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    const toastId = toast.loading("Uploading document and running AI analysis…");
    try {
      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.document.status === "FAILED") {
        toast.error(data.document.errorMessage || "AI analysis failed.", { id: toastId });
      } else {
        toast.success("Document analyzed successfully!", { id: toastId });
      }
      onUploaded?.(data.document);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed. Please try again.", {
        id: toastId,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    validateAndUpload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`card border-dashed border-2 p-8 text-center transition-colors ${
        dragActive ? "border-brand-500 bg-brand-50" : "border-slate-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT.join(",")}
        className="hidden"
        onChange={(e) => validateAndUpload(e.target.files?.[0])}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
          {uploading ? <Loader2 className="animate-spin" size={22} /> : <UploadCloud size={22} />}
        </div>
        <div>
          <p className="font-semibold text-slate-800">
            {uploading ? "Analyzing your document with AI…" : "Drop a document here to analyze it"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            PDF, DOC, DOCX or TXT · up to 10MB · AI extracts deadlines, requirements, risks & tasks
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-primary mt-2"
        >
          {uploading ? "Please wait…" : "Choose file"}
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;
