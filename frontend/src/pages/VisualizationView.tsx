import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Compass, Flag, Navigation, ShieldAlert, Zap, Award, Loader2, CheckCircle2 } from 'lucide-react';

const VisualizationView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject, analyses, fetchProjects, setActiveProject, startAnalysis, fetchAnalyses } = useProjectStore();

  const [landingSites, setLandingSites] = useState<any[]>([]);
  const [selectedLandingSite, setSelectedLandingSite] = useState<any | null>(null);
  const [pathResult, setPathResult] = useState<any | null>(null);
  const [calculatingLanding, setCalculatingLanding] = useState(false);
  const [planningPath, setPlanningPath] = useState(false);

  useEffect(() => {
    if (!activeProject && projectId) {
      fetchProjects().then(() => {
        const matched = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (matched) setActiveProject(matched);
      });
    }
  }, [projectId]);

  useEffect(() => {
    if (activeProject && analyses.length === 0) {
      fetchAnalyses(activeProject.id);
    }
  }, [activeProject]);

  const handleRankLandingSites = async () => {
    if (!activeProject) return;
    setCalculatingLanding(true);
    try {
      // Look for an existing ice detection analysis to link
      const iceAn = analyses.find(a => a.analysisType === 'ice_detection');
      const res = await startAnalysis(activeProject.id, {
        analysisType: 'landing_site_calculation',
        parameters: { iceAnalysisId: iceAn?.id || 'simulated_ice_context' }
      });
      
      const interval = setInterval(() => {
        fetchAnalyses(activeProject.id).then(() => {
          const updated = useProjectStore.getState().analyses.find(a => a.id === res.id);
          if (updated && updated.status === 'completed') {
            clearInterval(interval);
            setLandingSites(updated.resultData?.landingSites || []);
            setCalculatingLanding(false);
          }
        });
      }, 2000);
    } catch (err) {
      console.error(err);
      setCalculatingLanding(false);
    }
  };

  const handlePlanPath = async (site: any) => {
    if (!activeProject) return;
    setSelectedLandingSite(site);
    setPlanningPath(true);
    try {
      const res = await startAnalysis(activeProject.id, {
        analysisType: 'path_planning',
        parameters: { landingSiteId: `site_rank_${site.rank}`, targetCraterId: activeProject.id }
      });

      const interval = setInterval(() => {
        fetchAnalyses(activeProject.id).then(() => {
          const updated = useProjectStore.getState().analyses.find(a => a.id === res.id);
          if (updated && updated.status === 'completed') {
            clearInterval(interval);
            setPathResult(updated.resultData);
            setPlanningPath(false);
          }
        });
      }, 2000);
    } catch (err) {
      console.error(err);
      setPlanningPath(false);
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
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <Compass className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">3D Rover & Landing Site Simulation</h1>
            <p className="text-slate-400 text-sm mt-1">
              Multi-criteria landing matrix ranking & solar-optimized hazard avoidance path generation.
            </p>
          </div>
        </div>

        <button
          onClick={handleRankLandingSites}
          disabled={calculatingLanding}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm tracking-wide uppercase flex-shrink-0 disabled:opacity-50"
        >
          {calculatingLanding ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Running Decision Matrix...</span>
            </>
          ) : (
            <>
              <Award className="h-5 w-5" />
              <span>Rank Landing Sites</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flag className="h-6 w-6 text-blue-400" />
            <span>Candidate Landing Zones</span>
          </h2>

          {landingSites.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-900/40 text-slate-500 text-sm">
              Click 'Rank Landing Sites' to compute optimal landing zones near {activeProject.targetRegion}.
            </div>
          ) : (
            <div className="space-y-4">
              {landingSites.map((site) => (
                <div
                  key={site.rank}
                  className={`bg-slate-900/60 backdrop-blur-xl border rounded-2xl p-6 transition-all cursor-pointer ${
                    selectedLandingSite?.rank === site.rank ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => handlePlanPath(site)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      Rank #{site.rank}
                    </span>
                    <span className="text-xs font-bold text-slate-300">Score: {site.combinedScore}</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between"><span>Safety (Slope &lt; 10°):</span> <strong className="text-white">{site.safetyScore}</strong></div>
                    <div className="flex justify-between"><span>Proximity to Ice:</span> <strong className="text-white">{site.proximityScore}</strong></div>
                    <div className="flex justify-between"><span>Solar Irradiance:</span> <strong className="text-white">{site.solarScore}</strong></div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-bold">
                    <span>Lat: {site.lat} / Lng: {site.lng}</span>
                    <span>{planningPath && selectedLandingSite?.rank === site.rank ? 'Planning...' : 'Generate Traverse →'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="h-6 w-6 text-blue-400" />
            <span>Rover Traversal Telemetry</span>
          </h2>

          {planningPath ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-24 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <h3 className="text-lg font-bold text-slate-300">Calculating Obstacle Avoidance Traversal...</h3>
              <p className="text-slate-500 text-xs text-center max-w-sm">Optimizing solar recharge exposure and avoiding high slope hazard zones using RRT* path planning.</p>
            </div>
          ) : !pathResult ? (
            <div className="border border-dashed border-slate-800 rounded-3xl p-24 text-center bg-slate-900/40 text-slate-500 flex flex-col items-center justify-center space-y-4">
              <Compass className="h-16 w-16 text-slate-600" />
              <h3 className="text-xl font-bold text-slate-300">No Rover Traverse Generated</h3>
              <p className="text-slate-500 text-sm max-w-md text-center">
                Select a ranked landing zone on the left to simulate the rover traverse path to the high-CPR subsurface ice deposits.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Navigation className="h-4 w-4 text-blue-400" /> Total Distance</span>
                  <span className="text-4xl font-black text-white mt-4">{pathResult.distanceKm} <span className="text-sm font-normal text-slate-500">km</span></span>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-400" /> Energy Consumption</span>
                  <span className="text-4xl font-black text-amber-400 mt-4">{pathResult.energyConsumptionWh} <span className="text-sm font-normal text-slate-500">Wh</span></span>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Traversal Time</span>
                  <span className="text-4xl font-black text-emerald-400 mt-4">{pathResult.estimatedTraversalTimeHours} <span className="text-sm font-normal text-slate-500">Hours</span></span>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-bold text-white">Traverse Waypoints & Hazard Flags</h3>
                
                <div className="relative pl-6 border-l-2 border-slate-800 space-y-8">
                  {pathResult.waypoints?.map((wp: any, index: number) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-slate-950" />
                      <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-white font-bold text-sm">Waypoint 0{index + 1}</h4>
                          <p className="text-slate-500 text-xs mt-1">Lat: {wp.lat.toFixed(4)} / Lng: {wp.lng.toFixed(4)}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${
                          wp.hazardFlag === 'none' || wp.hazardFlag === 'target_reached' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          wp.hazardFlag === 'ice_proximity' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {wp.hazardFlag !== 'none' && <ShieldAlert className="h-3.5 w-3.5" />}
                          {wp.hazardFlag.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizationView;
