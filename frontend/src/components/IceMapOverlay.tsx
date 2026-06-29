import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Layers, ZoomIn, ZoomOut, RotateCcw, Info, Eye, EyeOff } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IceAnomaly {
  lat: number;
  lng: number;
  cpr: number;
  dop: number;
  depthMeters?: number;
  concentration?: number;
  clusterId?: number;
}

interface LandingSite {
  rank: number;
  lat: number;
  lng: number;
  combinedScore: number;
  safetyScore: number;
  solarScore: number;
}

interface WaypointPoint {
  lat: number;
  lng: number;
  hazardFlag: string;
}

interface IceMapOverlayProps {
  anomalies?: IceAnomaly[];
  landingSites?: LandingSite[];
  roverWaypoints?: WaypointPoint[];
  iceAreaKm2?: number;
  cprPeak?: number;
  className?: string;
}

// ─── Color Helpers ──────────────────────────────────────────────────────────

function cprToColor(cpr: number, alpha = 0.75): string {
  // CPR heatmap: blue (low) → cyan → green → yellow → red (high)
  if (cpr < 0.5)  return `rgba(0, 50, 200, ${alpha})`;
  if (cpr < 0.8)  return `rgba(30, 120, 220, ${alpha})`;
  if (cpr < 1.0)  return `rgba(60, 180, 120, ${alpha})`;
  if (cpr < 1.2)  return `rgba(220, 200, 30, ${alpha})`;
  if (cpr < 1.5)  return `rgba(255, 140, 20, ${alpha})`;
  return `rgba(255, 30, 30, ${alpha})`;
}

function dopToColor(dop: number, alpha = 0.75): string {
  // DOP heatmap: green (low DOP = ice) → yellow → red (high DOP = rocky)
  if (dop < 0.05) return `rgba(30, 255, 120, ${alpha})`;
  if (dop < 0.10) return `rgba(120, 235, 80, ${alpha})`;
  if (dop < 0.13) return `rgba(210, 220, 40, ${alpha})`;
  if (dop < 0.20) return `rgba(255, 160, 30, ${alpha})`;
  return `rgba(255, 50, 50, ${alpha})`;
}

function hazardToColor(flag: string): string {
  switch (flag) {
    case 'none':          return '#22c55e';
    case 'moderate_slope':return '#f59e0b';
    case 'ice_proximity': return '#60a5fa';
    case 'target_reached':return '#a78bfa';
    default:              return '#94a3b8';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const IceMapOverlay: React.FC<IceMapOverlayProps> = ({
  anomalies = [],
  landingSites = [],
  roverWaypoints = [],
  iceAreaKm2 = 0,
  cprPeak = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [colorMode, setColorMode] = useState<'cpr' | 'dop' | 'ice'>('cpr');
  const [showLanding, setShowLanding] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [hoveredAnomaly, setHoveredAnomaly] = useState<IceAnomaly | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  // Synthetic background grid of CPR/DOP values to fill the map
  const gridRef = useRef<{ cpr: number[][]; dop: number[][] } | null>(null);

  useEffect(() => {
    // Generate a realistic 60x60 background grid
    const ROWS = 60, COLS = 60;
    const cpr: number[][] = [];
    const dop: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      cpr.push([]);
      dop.push([]);
      for (let c = 0; c < COLS; c++) {
        // Base values
        let baseCpr = 0.3 + Math.random() * 0.5;
        let baseDop = 0.25 + Math.random() * 0.25;
        // Crater floor (center zone): higher CPR, lower DOP (ice signal)
        const dr = r - ROWS / 2;
        const dc = c - COLS / 2;
        const dist = Math.sqrt(dr * dr + dc * dc);
        if (dist < 15) {
          baseCpr = 1.1 + Math.random() * 0.75;
          baseDop = 0.04 + Math.random() * 0.09;
        } else if (dist < 22) {
          baseCpr = 0.7 + Math.random() * 0.4;
          baseDop = 0.12 + Math.random() * 0.15;
        }
        cpr[r].push(baseCpr);
        dop[r].push(baseDop);
      }
    }
    gridRef.current = { cpr, dop };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // ── Background heatmap ──────────────────────────────────────────────────
    const grid = gridRef.current;
    const ROWS = grid.cpr.length;
    const COLS = grid.cpr[0].length;
    const cellW = (W / COLS) * scale;
    const cellH = (H / ROWS) * scale;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellW + offset.x;
        const y = r * cellH + offset.y;
        const cprVal = grid.cpr[r][c];
        const dopVal = grid.dop[r][c];

        let color: string;
        if (colorMode === 'cpr') {
          color = cprToColor(cprVal, 0.70);
        } else if (colorMode === 'dop') {
          color = dopToColor(dopVal, 0.70);
        } else {
          // Ice overlay: green where CPR > 1.0 AND DOP < 0.13
          const isIce = cprVal > 1.0 && dopVal < 0.13;
          color = isIce
            ? `rgba(100, 220, 255, ${0.45 + cprVal * 0.15})`
            : `rgba(15, 25, 50, 0.65)`;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }

    // ── Grid lines ─────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.10)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r += 5) {
      ctx.beginPath();
      ctx.moveTo(offset.x, r * cellH + offset.y);
      ctx.lineTo(W, r * cellH + offset.y);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c += 5) {
      ctx.beginPath();
      ctx.moveTo(c * cellW + offset.x, offset.y);
      ctx.lineTo(c * cellW + offset.x, H);
      ctx.stroke();
    }

    // ── Coordinate helpers ─────────────────────────────────────────────────
    // Map lat/lng to canvas coordinates using known bounds
    const LAT_MIN = -87.55, LAT_MAX = -86.85;
    const LNG_MIN = 83.8, LNG_MAX = 84.8;
    const latToY = (lat: number) => ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H * scale + offset.y;
    const lngToX = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W * scale + offset.x;

    // ── Anomaly bubbles ─────────────────────────────────────────────────────
    anomalies.forEach((a, idx) => {
      const x = lngToX(a.lng);
      const y = latToY(a.lat);
      const radius = (5 + (a.cpr - 1.0) * 12) * scale;

      // Pulsing glow
      const glowRadius = radius * 2.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      grad.addColorStop(0, 'rgba(100, 220, 255, 0.60)');
      grad.addColorStop(0.5, 'rgba(60, 140, 255, 0.20)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Main dot
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = a.cpr > 1.0 && a.dop < 0.13
        ? 'rgba(100, 220, 255, 0.90)'
        : 'rgba(255, 160, 50, 0.80)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      if (scale > 0.8) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `${10 * scale}px 'Inter', sans-serif`;
        ctx.fillText(`CPR:${a.cpr.toFixed(2)}`, x + radius + 4, y - 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`DOP:${a.dop.toFixed(3)}`, x + radius + 4, y + 12);
      }
    });

    // ── Landing site markers ────────────────────────────────────────────────
    if (showLanding) {
      landingSites.forEach(site => {
        const x = lngToX(site.lng);
        const y = latToY(site.lat);

        // Star marker
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = site.rank === 1 ? '#fbbf24' : site.rank === 2 ? '#94a3b8' : '#a78bfa';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        drawStar(ctx, 0, 0, 5, 12 * scale, 6 * scale);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (scale > 0.7) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${11 * scale}px 'Inter', sans-serif`;
          ctx.fillText(`LS-${site.rank}`, x + 14, y - 4);
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${9 * scale}px 'Inter', sans-serif`;
          ctx.fillText(`Score: ${(site.combinedScore * 100).toFixed(0)}%`, x + 14, y + 8);
        }
      });
    }

    // ── Rover path ─────────────────────────────────────────────────────────
    if (showPath && roverWaypoints.length > 1) {
      // Dashed path line
      ctx.setLineDash([8 * scale, 4 * scale]);
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.beginPath();
      roverWaypoints.forEach((wp, i) => {
        const x = lngToX(wp.lng);
        const y = latToY(wp.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoint dots
      roverWaypoints.forEach((wp, i) => {
        const x = lngToX(wp.lng);
        const y = latToY(wp.lat);
        const r = 5 * scale;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = hazardToColor(wp.hazardFlag);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (scale > 0.8 && i > 0 && i < roverWaypoints.length - 1) {
          ctx.fillStyle = '#c4b5fd';
          ctx.font = `${9 * scale}px mono`;
          ctx.fillText(`WP${i}`, x + 7, y - 3);
        }
      });
    }

    // ── Center cross-hair ──────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── North indicator ────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 12px Inter';
    ctx.fillText('N ↑', W - 30, 20);

    // ── Scale bar ──────────────────────────────────────────────────────────
    const scaleBarKm = 0.5;
    const scaleBarPx = scaleBarKm * (W / (LNG_MAX - LNG_MIN)) * (1 / 111.32) * scale;
    ctx.fillStyle = '#fff';
    ctx.fillRect(20, H - 24, scaleBarPx, 3);
    ctx.fillText(`${scaleBarKm} km`, 20, H - 8);

  }, [scale, offset, colorMode, showLanding, showPath, anomalies, landingSites, roverWaypoints]);

  useEffect(() => { draw(); }, [draw]);

  // Drag/pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(0.3, Math.min(4.0, s - e.deltaY * 0.001)));
  };

  return (
    <div className={`relative flex flex-col bg-gray-950 rounded-xl border border-blue-900/40 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-blue-900/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300 tracking-wider uppercase">DFSAR Polarimetric Map</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Color mode toggle */}
          {(['cpr', 'dop', 'ice'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-2 py-0.5 rounded text-xs font-mono uppercase transition-all
                ${colorMode === mode
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {mode}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button onClick={() => setShowLanding(v => !v)} title="Toggle landing sites"
            className={`p-1 rounded transition-all ${showLanding ? 'text-yellow-400' : 'text-gray-600'}`}>
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowPath(v => !v)} title="Toggle rover path"
            className={`p-1 rounded transition-all ${showPath ? 'text-purple-400' : 'text-gray-600'}`}>
            <Activity className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button onClick={() => setScale(s => Math.min(4, s * 1.25))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(s => Math.max(0.3, s * 0.8))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={400}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ maxHeight: 400 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-900/60 border-t border-blue-900/30 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {['#0032c8', '#1e78dc', '#3cb478', '#dcc81e', '#ff8c14', '#ff1e1e'].map(c => (
              <div key={c} style={{ background: c, width: 14, height: 10, borderRadius: 2 }} />
            ))}
          </div>
          <span className="text-gray-500">CPR: Low → High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-gray-500">Ice anomaly (CPR&gt;1, DOP&lt;0.13)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', background: '#fbbf24' }} />
          <span className="text-gray-500">Landing site</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-purple-400" style={{ borderTop: '2px dashed #a78bfa' }} />
          <span className="text-gray-500">Rover path</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-cyan-400/80">
          <Activity className="w-3 h-3" />
          <span>Ice area: <strong>{iceAreaKm2.toFixed(1)} km²</strong></span>
          <span className="text-gray-600">|</span>
          <span>Peak CPR: <strong>{cprPeak.toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
};

// ─── Star shape helper ──────────────────────────────────────────────────────
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export default IceMapOverlay;
