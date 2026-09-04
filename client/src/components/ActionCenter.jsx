import { CheckCircle2, Circle, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { PriorityBadge } from "./Badges.jsx";

const ActionCenter = ({ document, onUpdated }) => {
  const toggle = async (action) => {
    try {
      const { data } = await api.patch(
        `/documents/${document._id}/actions/${action._id}`,
        { completed: !action.completed }
      );
      onUpdated(data.document);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update action.");
    }
  };

  const actions = document.actions || [];
  const completedCount = actions.filter((a) => a.completed).length;

  if (actions.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-500 text-sm">
        No action items were generated for this document.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Action Center</h3>
        <span className="text-sm text-slate-500">
          {completedCount}/{actions.length} completed
        </span>
      </div>
      <ul className="space-y-3">
        {actions.map((action) => (
          <li
            key={action._id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              action.completed ? "bg-slate-50 border-slate-200" : "border-slate-200"
            }`}
          >
            <button onClick={() => toggle(action)} className="mt-0.5 shrink-0">
              {action.completed ? (
                <CheckCircle2 className="text-emerald-600" size={20} />
              ) : (
                <Circle className="text-slate-300" size={20} />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={`font-medium ${
                  action.completed ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {action.title}
              </p>
              {action.description && (
                <p className="text-sm text-slate-500 mt-0.5">{action.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <PriorityBadge priority={action.priority} />
                {action.dueDate && (
                  <span className="badge bg-slate-100 text-slate-600">
                    <CalendarDays size={12} />
                    {new Date(action.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActionCenter;
