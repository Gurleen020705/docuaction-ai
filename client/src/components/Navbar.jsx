import { Link, useNavigate } from "react-router-dom";
import { FileText, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <FileText size={18} />
          </span>
          <span className="text-lg tracking-tight">
            DocuAction <span className="text-brand-600">AI</span>
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500 leading-tight">{user.email}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <button onClick={handleLogout} className="btn-ghost" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
