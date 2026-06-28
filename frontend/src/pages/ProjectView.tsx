import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { FileUp, Database, Cpu, Compass, Loader2, Disc, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const ProjectView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore(state => state.token);
  const { activeProject, datasets, fetchProjects, projects, setActiveProject, fetchDatasets } = useProjectStore();

  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('Chandrayaan2_DFSAR_LUPEX_SouthPole_BandL.tif');
  const [type, setType] = useState('DFSAR');
  const [fileUrl, setFileUrl] = useState('https://storage.googleapis.com/isro-lupex-samples/Chandrayaan2_DFSAR_LUPEX_SouthPole_BandL.tif');
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setUploading(true);
    try {
      await axios.post(
        `/api/v1/projects/${activeProject.id}/datasets`,
        { name, type, fileUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDatasets(activeProject.id);
      setShowUploadModal(false);
    } catch (err) {
      console.error(err);
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
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">{activeProject.description}</p>
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
          <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-bold">
            {datasets.length} Active Files
          </span>
        </div>

        {datasets.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No datasets ingested yet. Click 'Ingest Radar/Optical Data' above to add Chandrayaan-2 DFSAR or OHRC files.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map((ds) => (
              <div key={ds.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400">
                    <Disc className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{ds.name}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Type: <strong className="text-cyan-400">{ds.type}</strong> · Uploaded {new Date(ds.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Ingest Chandrayaan-2 Data</h2>
            
            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Source File URL / Repository</label>
                <input
                  type="text"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
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
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
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
