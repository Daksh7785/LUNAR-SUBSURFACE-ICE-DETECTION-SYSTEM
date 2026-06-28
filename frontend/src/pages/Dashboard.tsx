import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Globe, Layers, MapPin, Plus, Loader2, ArrowRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { projects, loading, fetchProjects, setActiveProject, createProject } = useProjectStore();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetRegion, setTargetRegion] = useState('Faustini Crater (South Pole)');
  const [lat, setLat] = useState(-88.521);
  const [lng, setLng] = useState(45.05);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
    setActiveProject(null);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newProj = await createProject({
        name,
        description,
        targetRegion,
        coordinates: { lat, lng }
      });
      setShowModal(false);
      navigate(`/projects/${newProj.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenProject = (project: any) => {
    setActiveProject(project);
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50">
        <div>
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Globe className="h-3.5 w-3.5" />
            <span>Lunar South Pole Missions</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-wide">LUPEX Exploration Workspaces</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Select an active crater assessment workspace or initialize a new polarimetric radar survey for subsurface ice detection and rover landing verification.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-4 rounded-2xl shadow-lg shadow-cyan-500/25 transition-all text-sm tracking-wide uppercase flex-shrink-0"
        >
          <FolderPlus className="h-5 w-5" />
          <span>New Exploration Workspace</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-3xl p-16 text-center bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
          <Layers className="h-16 w-16 text-slate-600" />
          <h3 className="text-xl font-bold text-slate-300">No Active Exploration Workspaces</h3>
          <p className="text-slate-500 text-sm max-w-md text-center">
            Initialize your first workspace to ingest Chandrayaan-2 DFSAR/OHRC radar files and execute polarimetric ice classification.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-slate-600 px-5 py-3 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Workspace</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => handleOpenProject(proj)}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    {proj.targetRegion}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {proj.name}
                </h3>
                <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                  {proj.description || 'Target crater evaluation for subsurface volatile distribution.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-white transition-colors">
                <span>Lat: {proj.coordinates?.lat} / Lng: {proj.coordinates?.lng}</span>
                <div className="flex items-center gap-1 bg-cyan-500/10 text-cyan-400 px-3 py-1.5 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-all font-bold">
                  <span>Access Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Initialize Exploration Workspace</h2>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Shackleton Ice Survey Alpha"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="Goals and target parameters..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Target Region</label>
                <input
                  type="text"
                  required
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Target Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Target Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Initialize Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
