import { AlertTriangle, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const PRIORITY_STYLES = {
  HIGH: "bg-red-50 text-red-700 ring-1 ring-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export const PriorityBadge = ({ priority }) => (
  <span className={`badge ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.MEDIUM}`}>
    {priority === "HIGH" && <AlertTriangle size={12} />}
    {priority || "MEDIUM"}
  </span>
);

const STATUS_CONFIG = {
  PENDING: { label: "Pending", cls: "bg-slate-100 text-slate-600", icon: Clock },
  PROCESSING: { label: "Analyzing…", cls: "bg-blue-50 text-blue-700", icon: Loader2 },
  COMPLETED: { label: "Analyzed", cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  FAILED: { label: "Failed", cls: "bg-red-50 text-red-700", icon: XCircle },
};

export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls}`}>
      <Icon size={12} className={status === "PROCESSING" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => (
  <span className={`badge ${PRIORITY_STYLES[severity] || PRIORITY_STYLES.MEDIUM}`}>
    {severity || "MEDIUM"}
  </span>
);
