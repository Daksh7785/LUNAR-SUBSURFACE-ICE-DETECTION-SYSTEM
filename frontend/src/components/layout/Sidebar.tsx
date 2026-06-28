import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, Compass, Cpu, Layers, Disc } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const Sidebar: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const activeProject = useProjectStore(state => state.activeProject);

  const navItems = [
    { to: '/', label: 'Mission Dashboard', icon: LayoutDashboard, exact: true },
  ];

  if (activeProject || projectId) {
    const currentId = activeProject?.id || projectId;
    navItems.push(
      { to: `/projects/${currentId}`, label: 'Project Overview', icon: Layers, exact: true },
      { to: `/projects/${currentId}/mission-control`, label: 'Mission Control Hub', icon: LayoutDashboard, exact: false },
      { to: `/projects/${currentId}/analysis`, label: 'AI Ice Analysis', icon: Cpu, exact: false },
      { to: `/projects/${currentId}/visualize`, label: '3D Simulation & Path', icon: Compass, exact: false }
    );
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between hidden md:flex">
      <div className="p-4">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/50 mb-4">
          Navigation Subsystem
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Disc className="h-4 w-4 animate-spin text-emerald-500" />
          <span>DFSAR & OHRC Data Sync: <strong className="text-emerald-400">Online</strong></span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
