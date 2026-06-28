import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { Moon, LogOut, Shield, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const activeProject = useProjectStore(state => state.activeProject);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-cyan-400 font-bold text-lg tracking-wide hover:text-cyan-300 transition-colors">
          <Moon className="h-6 w-6 animate-pulse text-cyan-500" />
          <span>ISRO LUPEX</span>
        </Link>

        {activeProject && (
          <div className="flex items-center gap-2 text-slate-400 text-sm pl-4 border-l border-slate-800">
            <ChevronRight className="h-4 w-4" />
            <Link to={`/projects/${activeProject.id}`} className="hover:text-white font-medium transition-colors">
              {activeProject.name}
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-sm">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="text-slate-300 font-medium">{user?.email || 'mission_control@isro.gov.in'}</span>
          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ml-1">
            {user?.role || 'Expert'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors py-2 px-3 hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-800"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium hidden md:inline">Exit Mission Control</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
