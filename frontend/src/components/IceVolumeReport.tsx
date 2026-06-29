import React from 'react';
import { Waves, Disc, Percent, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface IceVolumeReportProps {
  cprMean: number;
  dopMean: number;
  iceDetectedAreaKm2: number;
  estimatedIceVolumeM3: number;
  estimatedIceVolumeKm3: number;
  averageIceConcentrationPct: number;
  confidenceScore: number;
  regolithDepthM?: number;
}

const IceVolumeReport: React.FC<IceVolumeReportProps> = ({
  cprMean = 0,
  dopMean = 0,
  iceDetectedAreaKm2 = 0,
  estimatedIceVolumeM3 = 0,
  estimatedIceVolumeKm3 = 0,
  averageIceConcentrationPct = 0,
  confidenceScore = 0,
  regolithDepthM = 5.0,
}) => {
  const chartData = [
    { name: 'Regolith Volume', value: iceDetectedAreaKm2 * 1e6 * regolithDepthM, fill: '#1e293b' },
    { name: 'Subsurface Ice', value: estimatedIceVolumeM3, fill: '#06b6d4' },
  ];

  return (
    <div className="bg-gray-950 rounded-xl border border-cyan-900/40 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-cyan-300 tracking-wider uppercase">Volumetric Ice Estimate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono bg-cyan-900/40 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800/30">
            Dielectric Mixing Model
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[380px]">
        {/* Core Equation Box */}
        <div className="bg-gray-900/50 border border-cyan-950/60 p-3 rounded-lg text-xs font-mono text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
          <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Linear Permittivity Mixing</div>
          <div className="text-cyan-300 font-bold text-sm">ε_mix = f_ice·ε_ice + (1 - f_ice)·ε_regolith</div>
          <div className="text-[10px] text-gray-400 mt-1">
            Solving for volumetric fraction (f_ice) using observed DFSAR dielectric properties.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900/30 border border-cyan-950/20 p-2.5 rounded-lg text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Ice Volume</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
              {(estimatedIceVolumeM3 / 1e6).toFixed(4)} km³
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">{(estimatedIceVolumeM3).toLocaleString()} m³</div>
          </div>
          <div className="bg-gray-900/30 border border-cyan-950/20 p-2.5 rounded-lg text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Avg Concentration</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
              {averageIceConcentrationPct.toFixed(1)}%
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">Volumetric fill</div>
          </div>
          <div className="bg-gray-900/30 border border-cyan-950/20 p-2.5 rounded-lg text-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Confidence</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {(confidenceScore * 100).toFixed(1)}%
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">Bayesian scoring</div>
          </div>
        </div>

        {/* Volumetric Breakdown Chart */}
        <div className="flex-1 min-h-[140px] flex flex-col justify-end">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider mb-2 block">Regolith vs Ice Volume (m³)</span>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9} width={80} />
                <Tooltip
                  contentStyle={{ background: '#090d16', border: '1px solid #164e63' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} m³`, 'Volume']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Informative Alert */}
        <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-blue-300">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>L-Band Penetration:</strong> Volume calculation assumes a nominal penetration depth of {regolith_depthM}m 
            within permanently shadowed cryogenic targets. Surface desiccation layer (0.5m) excluded.
          </div>
        </div>
      </div>
    </div>
  );
};

export default IceVolumeReport;
