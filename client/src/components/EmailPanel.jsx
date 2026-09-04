import { useState } from "react";
import { Mail, Copy, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const EmailPanel = ({ document, onUpdated }) => {
  const [generating, setGenerating] = useState(false);
  const email = document.generatedEmail;

  const handleGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading("Drafting an email with AI…");
    try {
      const { data } = await api.post(`/documents/${document._id}/email`);
      onUpdated(data.document);
      toast.success("Email drafted!", { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate email.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    toast.success("Copied to clipboard.");
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Mail size={18} className="text-brand-600" /> AI-generated email / response
        </h3>
        <button onClick={handleGenerate} disabled={generating} className="btn-secondary">
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {email ? "Regenerate" : "Generate"}
        </button>
      </div>

      {email ? (
        <div className="relative">
          <pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-80 overflow-y-auto font-sans">
            {email}
          </pre>
          <button
            onClick={handleCopy}
            className="btn-ghost absolute top-2 right-2 bg-white shadow-sm"
            title="Copy"
          >
            <Copy size={14} />
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Generate a ready-to-send email or application response based on this document's
          requirements and deadlines.
        </p>
      )}
    </div>
  );
};

export default EmailPanel;
