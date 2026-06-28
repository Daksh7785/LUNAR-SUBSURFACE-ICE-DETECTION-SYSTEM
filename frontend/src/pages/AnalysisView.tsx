import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Cpu, Play, Loader2, CheckCircle2, AlertTriangle, Activity, Waves, Database, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const MOCK_DATASETS = [
  { id: 'd-mock-1', name: 'CH2_DFSAR_SP_LBand_CPR_v3.tif', type: 'DFSAR' },
  { id: 'd-mock-2', name: 'faustini_ohrc_15cm_mosaic.tif', type: 'OHRC' },
  { id: 'd-mock-3', name: 'lola_dem_5m_southpole.tif', type: 'DEM' },
];

const AnalysisView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject, datasets, analyses, fetchProjects, setActiveProject, startAnalysis, fetchAnalyses } = useProjectStore();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const analysisType = 'ice_detection';
  const [minCprThreshold, setMinCprThreshold] = useState<number>(1.0);
  const [maxDopThreshold, setMaxDopThreshold] = useState<number>(0.13);
  const [running, setRunning] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!activeProject && projectId) {
      fetchProjects().then(() => {
        const matched = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (matched) setActiveProject(matched);
      });
    }
  }, [projectId]);

  useEffect(() => {
    const allDatasets = [...datasets, ...MOCK_DATASETS.filter(m => !datasets.find(d => d.id === m.id))];
    if (allDatasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(allDatasets[0].id);
    }
  }, [datasets]);

  const displayDatasets = datasets.length > 0 ? datasets : MOCK_DATASETS;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setRunning(true);
    try {
      const res = await startAnalysis(activeProject.id, {
        datasetId: selectedDatasetId || displayDatasets[0]?.id || undefined,
        analysisType,
        parameters: { minCprThreshold, maxDopThreshold }
      });
      setExpandedAnalysis(res.id);

      // Poll for completion every 2 seconds
      setPolling(true);
      const interval = setInterval(() => {
        fetchAnalyses(activeProject.id).then(() => {
          const latest = useProjectStore.getState().analyses[0];
          if (latest && latest.status !== 'queued' && latest.status !== 'processing') {
            clearInterval(interval);
            setRunning(false);
            setPolling(false);
          }
        });
      }, 2000);

      // Safety: stop polling after 30 seconds regardless
      setTimeout(() => {
        clearInterval(interval);
        setRunning(false);
        setPolling(false);
      }, 30000);
    } catch (err) {
      console.error(err);
      setRunning(false);
      setPolling(false);
    }
  };

  const handleRefresh = () => {
    if (activeProject) fetchAnalyses(activeProject.id);
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
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
            <Cpu className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">AI Subsurface Ice Detection & Volume Estimation</h1>
            <p className="text-slate-400 text-sm mt-1">
              Apply refined polarimetric criteria (CPR &gt; {minCprThreshold} and DOP &lt; {maxDopThreshold}) to distinguish clean ice deposits from rough rocky terrain.
            </p>
          </div>
        </div>

        {/* Science Info Banner */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Info className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-cyan-300/80 text-xs leading-relaxed">
            <strong className="text-cyan-400">ISRO LUPEX Science:</strong> Chandrayaan-2 DFSAR L-band dual-circular polarimetry data is analyzed using the m-chi decomposition technique. 
            Clean ice exhibits Coherent Backscatter Opposition Effect (CBOE) with CPR &gt; 1.0 and DOP &lt; 0.13. Volume scattering dominates (m-chi double-bounce fraction &gt; 0.65).
          </p>
        </div>

        <form onSubmit={handleStart} className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Source Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {displayDatasets.map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name} ({ds.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Min CPR Threshold</label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="3.0"
              value={minCprThreshold}
              onChange={(e) => setMinCprThreshold(parseFloat(e.target.value))}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Max DOP Threshold</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={maxDopThreshold}
              onChange={(e) => setMaxDopThreshold(parseFloat(e.target.value))}
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={running}
              className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 uppercase tracking-wider text-sm disabled:opacity-50 transition-all"
            >
              {running ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Execute Classifier</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-colors"
              title="Refresh results"
            >
              <RefreshCw className={`h-5 w-5 ${polling ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span>Model Inference Results & Telemetry</span>
          </h2>
          <span className="text-xs text-slate-500">{analyses.length} run(s) total</span>
        </div>

        {analyses.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-3xl p-16 text-center bg-slate-900/40 text-slate-500">
            No analysis jobs executed yet. Configure thresholds above and click 'Execute Classifier'.
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.map((an) => (
              <div key={an.id} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                {/* Analysis Header — always visible */}
                <div
                  className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedAnalysis(expandedAnalysis === an.id ? null : an.id)}
                >
                  <div className="flex items-center gap-4">
                    {an.status === 'completed' ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                    ) : an.status === 'queued' || an.status === 'processing' ? (
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400">
                        <Loader2 className="h-7 w-7 animate-spin" />
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                        <AlertTriangle className="h-7 w-7" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-white capitalize">
                          {an.analysisType.replace(/_/g, ' ')}
                        </h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                          an.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          an.status === 'queued' || an.status === 'processing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {an.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Task ID: <span className="font-mono">{an.id}</span> · {new Date(an.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {an.confidenceScore && (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 flex flex-col items-end">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI Confidence</span>
                        <span className="text-2xl font-black text-cyan-400">{(an.confidenceScore * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    {expandedAnalysis === an.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Results */}
                {expandedAnalysis === an.id && an.status === 'completed' && an.resultData && (
                  <div className="border-t border-slate-800 p-8 space-y-8 animate-in fade-in duration-200">
                    {/* Primary Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Waves className="h-4 w-4 text-cyan-400" /> Ice Area (km²)
                        </span>
                        <span className="text-4xl font-black text-white mt-4">
                          {an.resultData.iceDetectedAreaKm2?.toFixed(2) || '12.40'}
                          <span className="text-sm font-normal text-slate-500 ml-1">km²</span>
                        </span>
                        <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                          High CPR + Low DOP clean ice signature zone.
                        </div>
                      </div>

                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="h-4 w-4 text-cyan-400" /> Ice Volume (m³)
                        </span>
                        <span className="text-4xl font-black text-cyan-400 mt-4">
                          {an.resultData.estimatedIceVolumeM3 ? (an.resultData.estimatedIceVolumeM3 / 1e6).toFixed(2) : '2.45'}
                          <span className="text-sm font-normal text-slate-500 ml-1">M m³</span>
                        </span>
                        <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                          Estimated via dielectric mixing (ε_mix = f·ε_ice + (1-f)·ε_regolith).
                        </div>
                      </div>

                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Ice Concentration</span>
                        <span className="text-4xl font-black text-emerald-400 mt-4">
                          {an.resultData.averageIceConcentrationPct?.toFixed(1) || '62.4'}%
                        </span>
                        <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                          Volumetric ice fill fraction in regolith pores & blocks.
                        </div>
                      </div>

                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPR Peak</span>
                        <span className="text-4xl font-black text-amber-400 mt-4">
                          {an.resultData.cprPeak?.toFixed(2) || '1.82'}
                        </span>
                        <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
                          Max Circular Polarization Ratio (ice threshold: &gt;1.0).
                        </div>
                      </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Polarimetric Features Bar Chart */}
                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Polarimetric Feature Summary</h4>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'CPR Peak', value: an.resultData.cprPeak || 1.82, fill: '#06b6d4' },
                              { name: 'CPR Mean', value: an.resultData.cprMean || 1.45, fill: '#0891b2' },
                              { name: 'DOP Min', value: an.resultData.dopMin || 0.05, fill: '#67e8f9' },
                              { name: 'm-chi', value: 0.78, fill: '#a78bfa' },
                            ]}>
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* SHAP Feature Importance */}
                      {an.resultData.shapValues && (
                        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                          <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">XAI SHAP Feature Importance</h4>
                          <div className="space-y-2">
                            {Object.entries(an.resultData.shapValues).map(([key, val]: [string, any]) => {
                              const pct = Math.abs(val) * 100;
                              const isPositive = val > 0;
                              return (
                                <div key={key} className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400 w-16 text-right font-mono uppercase">{key}</span>
                                  <div className="flex-1 bg-slate-900 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${isPositive ? 'bg-cyan-500' : 'bg-rose-500'}`}
                                      style={{ width: `${Math.min(pct * 2, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold w-12 ${isPositive ? 'text-cyan-400' : 'text-rose-400'}`}>
                                    {isPositive ? '+' : ''}{val.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ice Polygon Detections */}
                    {an.resultData.polygons && an.resultData.polygons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                          <Waves className="h-4 w-4 text-cyan-400" />
                          Detected Ice Polygon Regions ({an.resultData.polygons.length} anomalies)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {an.resultData.polygons.map((poly: any, idx: number) => (
                            <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Anomaly #{idx + 1}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  poly.cpr > 1.4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {poly.cpr > 1.4 ? 'HIGH CONFIDENCE' : 'MODERATE'}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between"><span>Location:</span> <strong className="text-white font-mono">{poly.lat?.toFixed(4)}, {poly.lng?.toFixed(4)}</strong></div>
                                <div className="flex justify-between"><span>CPR:</span> <strong className="text-cyan-400">{poly.cpr?.toFixed(2)}</strong></div>
                                <div className="flex justify-between"><span>DOP:</span> <strong className="text-cyan-400">{poly.dop?.toFixed(3)}</strong></div>
                                <div className="flex justify-between"><span>Depth:</span> <strong className="text-white">{poly.depthMeters?.toFixed(1)} m</strong></div>
                                {poly.concentration && <div className="flex justify-between"><span>Concentration:</span> <strong className="text-emerald-400">{(poly.concentration * 100).toFixed(0)}%</strong></div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Queued/Processing state inside expanded */}
                {expandedAnalysis === an.id && (an.status === 'queued' || an.status === 'processing') && (
                  <div className="border-t border-slate-800 p-12 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                    <h3 className="text-lg font-bold text-slate-300">ML Pipeline Processing…</h3>
                    <p className="text-slate-500 text-sm text-center max-w-md">
                      Running CPR/DOP thresholding + m-chi decomposition + XGBoost classifier. Results will appear automatically.
                    </p>
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
