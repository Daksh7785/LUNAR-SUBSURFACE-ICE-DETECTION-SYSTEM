import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { FileUp, Database, Cpu, Compass, Loader2, Disc, ArrowRight, ShieldCheck, CheckCircle2, X } from 'lucide-react';

const ProjectView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProject, datasets, fetchProjects, projects, setActiveProject, ingestDataset } = useProjectStore();

  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('Chandrayaan2_DFSAR_LUPEX_SouthPole_BandL.tif');
  const [type, setType] = useState('DFSAR');
  const [fileUrl, setFileUrl] = useState('https://storage.googleapis.com/isro-lupex-samples/Chandrayaan2_DFSAR_LUPEX_SouthPole_BandL.tif');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!activeProject && projectId) {
      if (projects.length === 0) {
        fetchProjects().then(() => {
          const matched = useProjectStore.getState().projects.find(p => p.id === projectId);
          if (matched) setActiveProject(matched);
        });
      } else {
        const matched = projects.find(p => p.id === projectId);
        if (matched) setActiveProject(matched);
      }
    }
  }, [projectId, projects, activeProject]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setUploading(true);
    try {
      await ingestDataset(activeProject.id, { name, type, fileUrl });
      setShowUploadModal(false);
      showToast('success', `Dataset "${name}" ingested successfully. Processing pipeline initiated.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to ingest dataset. Check network and retry.');
    } finally {
      setUploading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200 border ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <X className="h-5 w-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {activeProject.targetRegion}
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Ingestion Stream Online
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">{activeProject.name}</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">{activeProject.description || 'Target crater evaluation for subsurface volatile distribution.'}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>Lat: <strong className="text-slate-300">{activeProject.coordinates?.lat}</strong></span>
            <span>Lng: <strong className="text-slate-300">{activeProject.coordinates?.lng}</strong></span>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
              activeProject.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              activeProject.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>{activeProject.status || 'active'}</span>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-4 rounded-2xl shadow-lg shadow-cyan-500/25 transition-all text-sm tracking-wide uppercase flex-shrink-0"
        >
          <FileUp className="h-5 w-5" />
          <span>Ingest Radar/Optical Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate(`/projects/${activeProject.id}/analysis`)}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-8 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-2xl hover:shadow-cyan-500/10"
        >
          <div>
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="h-8 w-8 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">AI Subsurface Ice Detection</h2>
            <p className="text-slate-400 text-sm mt-2">
              Run hybrid neural network & XGBoost classification on polarimetric SAR decompositions (CPR, DOP, m-chi) to map ice probabilities.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-lg font-bold">CPR &gt; 1.0</span>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-lg font-bold">DOP &lt; 0.13</span>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-lg font-bold">m-chi</span>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-cyan-400 font-bold text-sm">
            <span>Execute & Review Models</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate(`/projects/${activeProject.id}/visualize`)}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-2xl hover:shadow-blue-500/10"
        >
          <div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Compass className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">3D Rover & Landing Simulation</h2>
            <p className="text-slate-400 text-sm mt-2">
              Visualize landing zone safety ranking and simulate solar-optimized, hazard-avoiding rover traverses across doubly shadowed PSRs.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg font-bold">RRT* Path</span>
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg font-bold">Multi-criteria</span>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-blue-400 font-bold text-sm">
            <span>Launch Simulation Sandbox</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Ingested Mission Datasets</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-bold">
              {datasets.length} Active Files
            </span>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition-colors"
            >
              <FileUp className="h-3.5 w-3.5" />
              Add More
            </button>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No datasets ingested yet. Click 'Ingest Radar/Optical Data' above to add Chandrayaan-2 DFSAR or OHRC files.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map((ds) => (
              <div key={ds.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400">
                    <Disc className="h-6 w-6 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{ds.name}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Type: <strong className="text-cyan-400">{ds.type}</strong> · Uploaded {new Date(ds.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold flex-shrink-0">
                  READY
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Ingest Chandrayaan-2 Data</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Sensor Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="DFSAR">DFSAR (Dual-frequency Synthetic Aperture Radar)</option>
                  <option value="OHRC">OHRC (Orbiter High Resolution Camera)</option>
                  <option value="TMC2">TMC 2 (Terrain Mapping Camera 2)</option>
                  <option value="DEM">DEM (Digital Elevation Model - LOLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Source File URL / Repository</label>
                <input
                  type="text"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 hover:from-cyan-400 hover:to-blue-500 transition-all"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Ingest & Verify</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectView;
