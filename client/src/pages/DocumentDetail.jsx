import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  CalendarClock,
  ShieldAlert,
  FileWarning,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import { PriorityBadge, StatusBadge, SeverityBadge } from "../components/Badges.jsx";
import ActionCenter from "../components/ActionCenter.jsx";
import EmailPanel from "../components/EmailPanel.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

const Section = ({ icon: Icon, title, children }) => (
  <div className="card p-5">
    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
      <Icon size={18} className="text-brand-600" />
      {title}
    </h3>
    {children}
  </div>
);

const DocumentDetail = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDocument = async () => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      setDocument(data.document);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load document.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-16 flex justify-center">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-16 text-center text-slate-500">
          Document not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 break-all">
              {document.originalFileName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Uploaded {new Date(document.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} />
            {document.status === "COMPLETED" && <PriorityBadge priority={document.priority} />}
          </div>
        </div>

        {document.status === "PROCESSING" && (
          <div className="card p-6 flex items-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            AI is still analyzing this document. Refresh in a moment.
          </div>
        )}

        {document.status === "FAILED" && (
          <div className="card p-6 border-red-200 bg-red-50 text-red-700 text-sm">
            <strong>Analysis failed:</strong> {document.errorMessage}
          </div>
        )}

        {document.status === "COMPLETED" && (
          <>
            <Section icon={ClipboardList} title="Summary">
              <p className="text-slate-700 text-sm leading-relaxed">{document.summary}</p>
            </Section>

            <div className="grid md:grid-cols-2 gap-6">
              <Section icon={FileWarning} title="Requirements">
                {document.requirements.length === 0 ? (
                  <p className="text-sm text-slate-400">None identified.</p>
                ) : (
                  <ul className="space-y-2">
                    {document.requirements.map((req, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                )}

                {document.missingItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                      Missing items detected
                    </p>
                    <ul className="space-y-1">
                      {document.missingItems.map((item, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              <Section icon={CalendarClock} title="Deadlines">
                {document.deadlines.length === 0 ? (
                  <p className="text-sm text-slate-400">No deadlines detected.</p>
                ) : (
                  <ul className="space-y-3">
                    {document.deadlines.map((d, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{d.label}</span>
                        <span className="badge bg-amber-50 text-amber-700">
                          {d.date ? new Date(d.date).toLocaleDateString() : d.rawText || "TBD"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section icon={ShieldAlert} title="Risks">
              {document.risks.length === 0 ? (
                <p className="text-sm text-slate-400">No significant risks detected.</p>
              ) : (
                <ul className="space-y-3">
                  {document.risks.map((r, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-700">{r.description}</span>
                      <SeverityBadge severity={r.severity} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <ActionCenter document={document} onUpdated={setDocument} />

            <div className="grid md:grid-cols-2 gap-6">
              <EmailPanel document={document} onUpdated={setDocument} />
              <ChatPanel documentId={document._id} initialHistory={document.chatHistory} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DocumentDetail;
