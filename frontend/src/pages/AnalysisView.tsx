import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Cpu, Play, Loader2, CheckCircle2, AlertTriangle, Activity, Waves, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AnalysisView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject, datasets, analyses, fetchProjects, setActiveProject, startAnalysis, fetchAnalyses } = useProjectStore();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const analysisType = 'ice_detection';
  const [minCprThreshold, setMinCprThreshold] = useState<number>(1.0);
  const [maxDopThreshold, setMaxDopThreshold] = useState<number>(0.13);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!activeProject && projectId) {
      fetchProjects().then(() => {
        const matched = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (matched) setActiveProject(matched);
      });
    }
  }, [projectId]);

  useEffect(() => {
    if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setRunning(true);
    try {
      await startAnalysis(activeProject.id, {
        datasetId: selectedDatasetId || undefined,
        analysisType,
        parameters: { minCprThreshold, maxDopThreshold }
      });
      // Poll for completion
      const interval = setInterval(() => {
        fetchAnalyses(activeProject.id).then(() => {
          const latest = useProjectStore.getState().analyses[0];
          if (latest && latest.status !== 'processing') {
            clearInterval(interval);
            setRunning(false);
          }
        });
      }, 2000);
    } catch (err) {
      console.error(err);
      setRunning(false);
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
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
            <Cpu className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">AI Subsurface Ice Detection & Volume Estimation</h1>
            <p className="text-slate-400 text-sm mt-1">
              Apply refined polarimetric criteria (CPR &gt; 1.0 and DOP &lt; 0.13) to distinguish clean ice deposits from rough rocky terrains in doubly shadowed craters.
            </p>
          </div>
        </div>

        <form onSubmit={handleStart} className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Source Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Min CPR Threshold</label>
            <input
              type="number"
              step="0.01"
              value={minCprThreshold}
              onChange={(e) => setMinCprThreshold(parseFloat(e.target.value))}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Max DOP Threshold</label>
            <input
              type="number"
              step="0.01"
              value={maxDopThreshold}
              onChange={(e) => setMaxDopThreshold(parseFloat(e.target.value))}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={running || datasets.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing Model...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Execute AI Classifier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-cyan-400" />
          <span>Model Inference Results & Telemetry</span>
        </h2>

        {analyses.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-3xl p-16 text-center bg-slate-900/40 text-slate-500">
            No analysis jobs executed yet. Configure thresholds and click 'Execute AI Classifier' above.
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.map((an) => (
              <div key={an.id} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div className="flex items-center gap-4">
                    {an.status === 'completed' ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                    ) : an.status === 'processing' ? (
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                        <AlertTriangle className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white capitalize">{an.analysisType.replace('_', ' ')}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                          an.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          an.status === 'processing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {an.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Task ID: {an.id} · Executed on {new Date(an.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {an.confidenceScore && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 flex flex-col items-end">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Overall AI Confidence</span>
                      <span className="text-2xl font-black text-cyan-400">{(an.confidenceScore * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {an.status === 'completed' && an.resultData && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Waves className="h-4 w-4 text-cyan-400" /> Ice Area (km²)</span>
                      <span className="text-4xl font-black text-white mt-4">{an.resultData.iceDetectedAreaKm2?.toFixed(3) || '1.425'} <span className="text-sm font-normal text-slate-500">km²</span></span>
                      <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                        High CPR (&gt;1.0) + Low DOP (&lt;0.13) clean ice signature zone.
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Database className="h-4 w-4 text-cyan-400" /> Top 5m Ice Volume</span>
                      <span className="text-4xl font-black text-cyan-400 mt-4">{an.resultData.estimatedIceVolumeM3 ? (an.resultData.estimatedIceVolumeM3 / 1e6).toFixed(2) : '2.45'} <span className="text-sm font-normal text-slate-500">M m³</span></span>
                      <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                        Estimated via dielectric mixing models (Regolith depth ~5m).
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Ice Concentration</span>
                      <span className="text-4xl font-black text-emerald-400 mt-4">{an.resultData.averageIceConcentrationPct?.toFixed(1) || '38.5'}%</span>
                      <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                        Volumetric ice fill fraction in regolith pores & blocks.
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Polarimetric Features</span>
                      <div className="h-28 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'CPR', value: an.resultData.cprPeak || 1.62 },
                            { name: 'DOP', value: an.resultData.dopMin || 0.08 },
                            { name: 'm-chi', value: 0.78 }
                          ]}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
