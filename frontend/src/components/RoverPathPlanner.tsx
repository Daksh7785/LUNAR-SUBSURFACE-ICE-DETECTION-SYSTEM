import React, { useState } from 'react';
import { Compass, Shield, Zap, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';

interface Waypoint {
  lat: number;
  lng: number;
  hazardFlag: string;
  elevation?: number;
  slope?: number;
}

interface RoverPathPlannerProps {
  waypoints: Waypoint[];
  distanceKm: number;
  estimatedTimeHours: number;
  energyWh: number;
  maxSlopeDeg: number;
  onOptimizePath?: (params: { safetyWeight: number; slopeThreshold: number }) => void;
  isOptimizing?: boolean;
}

const RoverPathPlanner: React.FC<RoverPathPlannerProps> = ({
  waypoints = [],
  distanceKm = 0,
  estimatedTimeHours = 0,
  energyWh = 0,
  maxSlopeDeg = 0,
  onOptimizePath,
  isOptimizing = false,
}) => {
  const [safetyWeight, setSafetyWeight] = useState<number>(0.7);
  const [slopeThreshold, setSlopeThreshold] = useState<number>(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOptimizePath) {
      onOptimizePath({ safetyWeight, slopeThreshold });
    }
  };

  return (
    <div className="bg-gray-950 rounded-xl border border-purple-900/40 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-purple-900/30">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-xs font-semibold text-purple-300 tracking-wider uppercase">Rover Traverse path planner</span>
        </div>
        <span className="text-[10px] font-mono bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/30">
          A* Navigation Model
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-px bg-purple-950/20 border-b border-purple-900/20 text-center">
        <div className="p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Distance</div>
          <div className="text-lg font-bold text-white font-mono">{distanceKm.toFixed(2)} km</div>
        </div>
        <div className="p-3 border-l border-purple-900/10">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Time (Est)</div>
          <div className="text-lg font-bold text-white font-mono">{estimatedTimeHours.toFixed(1)} hrs</div>
        </div>
        <div className="p-3 border-l border-purple-900/10">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Energy Budget</div>
          <div className="text-lg font-bold text-purple-400 font-mono">{energyWh.toFixed(1)} Wh</div>
        </div>
        <div className="p-3 border-l border-purple-900/10">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Max Slope</div>
          <div className="text-lg font-bold text-amber-500 font-mono">{maxSlopeDeg.toFixed(1)}°</div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto max-h-[380px]">
        {/* Settings Panel */}
        <form onSubmit={handleSubmit} className="bg-gray-900/40 border border-purple-950/40 p-3 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Path Optimization Weights</span>
            <button
              type="submit"
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white rounded text-xs transition-all shadow-md shadow-purple-600/20"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Optimize Traverse
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Safety vs Speed Weight: {safetyWeight}</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={safetyWeight}
                onChange={(e) => setSafetyWeight(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Max Slope Limit: {slopeThreshold}°</label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={slopeThreshold}
                onChange={(e) => setSlopeThreshold(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </form>

        {/* Waypoints List */}
        <div className="flex-1 flex flex-col min-h-[140px]">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 block">Traverse Path Waypoints</span>
          <div className="flex-1 border border-purple-950/40 rounded-lg bg-gray-900/25 overflow-y-auto max-h-[160px] font-mono text-xs text-gray-300">
            {waypoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 italic p-4 text-center">
                No active traverse planned. Adjust parameters and click Optimize above.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-950/30 text-purple-300 text-[10px] uppercase border-b border-purple-900/30">
                    <th className="p-2">WP</th>
                    <th className="p-2">Latitude</th>
                    <th className="p-2">Longitude</th>
                    <th className="p-2">Hazard Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {waypoints.map((wp, idx) => (
                    <tr key={idx} className="border-b border-purple-950/20 hover:bg-purple-950/10">
                      <td className="p-2 text-purple-400 font-semibold">{idx === 0 ? 'START' : idx === waypoints.length - 1 ? 'END' : `WP${idx}`}</td>
                      <td className="p-2">{wp.lat.toFixed(5)}</td>
                      <td className="p-2">{wp.lng.toFixed(5)}</td>
                      <td className="p-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider
                          ${wp.hazardFlag === 'none' ? 'bg-green-950/50 text-green-400 border border-green-900/40' :
                            wp.hazardFlag === 'moderate_slope' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40' :
                            wp.hazardFlag === 'ice_proximity' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/40' :
                            'bg-purple-950/50 text-purple-400 border border-purple-900/40'}`}>
                          {wp.hazardFlag.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoverPathPlanner;
