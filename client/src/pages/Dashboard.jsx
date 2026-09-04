import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, ListChecks, AlertTriangle, CalendarClock, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Navbar from "../components/Navbar.jsx";
import DocumentUpload from "../components/DocumentUpload.jsx";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${tone}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [docsRes, statsRes] = await Promise.all([
        api.get("/documents"),
        api.get("/documents/dashboard/stats"),
      ]);
      setDocuments(docsRes.data.documents);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploaded = (doc) => {
    setDocuments((prev) => [doc, ...prev]);
    loadData();
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this document and all its data?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast.success("Document deleted.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete document.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Upload a document and let AI turn it into a summary, deadlines, and action items.
          </p>
        </div>

        <DocumentUpload onUploaded={handleUploaded} />

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={FileText}
              label="Documents analyzed"
              value={stats.totalDocuments}
              tone="bg-brand-50 text-brand-600"
            />
            <StatCard
              icon={ListChecks}
              label="Pending actions"
              value={stats.pendingActions}
              tone="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={AlertTriangle}
              label="High priority docs"
              value={stats.highPriorityDocs}
              tone="bg-red-50 text-red-600"
            />
            <StatCard
              icon={CalendarClock}
              label="Deadlines (14 days)"
              value={stats.upcomingDeadlines.length}
              tone="bg-amber-50 text-amber-600"
            />
          </div>
        )}

        {stats?.upcomingDeadlines?.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CalendarClock size={18} className="text-amber-600" /> Upcoming deadlines
            </h2>
            <ul className="divide-y divide-slate-100">
              {stats.upcomingDeadlines.map((d, i) => (
                <li key={i} className="py-2 flex items-center justify-between text-sm">
                  <Link
                    to={`/documents/${d.documentId}`}
                    className="text-slate-700 hover:text-brand-600"
                  >
                    {d.label}
                  </Link>
                  <span className="text-slate-500 font-medium">
                    {new Date(d.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Your documents</h2>

          {loading ? (
            <p className="text-slate-500 text-sm">Loading documents…</p>
          ) : documents.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              No documents yet. Upload your first one above to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/documents/${doc._id}`}
                  className="card p-5 hover:border-brand-300 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate max-w-xs">
                        {doc.originalFileName}
                      </h3>
                      <StatusBadge status={doc.status} />
                      {doc.status === "COMPLETED" && <PriorityBadge priority={doc.priority} />}
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {doc.summary || "AI is preparing an analysis for this document…"}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Uploaded {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, doc._id)}
                    className="btn-ghost text-slate-400 hover:text-red-600 shrink-0"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
