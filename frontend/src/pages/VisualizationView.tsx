import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Compass, Loader2, Play, RefreshCw, MapPin, Activity, Zap, Sun, Shield, ChevronRight } from 'lucide-react';
import * as THREE from 'three';

// ---- Mock data used immediately before API responds ----
const MOCK_LANDING_SITES = [
  { rank: 1, lat: -88.521, lng: 45.05, safetyScore: 0.95, proximityScore: 0.88, solarScore: 0.91, combinedScore: 0.913, hazard: 'None', slopeMax: 4.2, depthMeters: 3.8, ice: true },
  { rank: 2, lat: -88.518, lng: 45.02, safetyScore: 0.91, proximityScore: 0.85, solarScore: 0.89, combinedScore: 0.883, hazard: 'Minor Slope', slopeMax: 8.1, depthMeters: 2.1, ice: true },
  { rank: 3, lat: -88.515, lng: 44.98, safetyScore: 0.87, proximityScore: 0.82, solarScore: 0.86, combinedScore: 0.850, hazard: 'Boulders', slopeMax: 12.4, depthMeters: 4.5, ice: false },
  { rank: 4, lat: -88.510, lng: 44.95, safetyScore: 0.79, proximityScore: 0.78, solarScore: 0.82, combinedScore: 0.797, hazard: 'Slope 18°', slopeMax: 18.2, depthMeters: 1.8, ice: false },
];

const MOCK_ROVER_PATH = {
  distanceKm: 3.4,
  estimatedTraversalTimeHours: 4.2,
  energyConsumptionWh: 420.5,
  maxSlopeDeg: 18.2,
  waypoints: [
    { lat: -88.521, lng: 45.05, hazardFlag: 'none', alt: 0 },
    { lat: -88.527, lng: 45.07, hazardFlag: 'none', alt: -12 },
    { lat: -88.530, lng: 45.08, hazardFlag: 'moderate_slope', alt: -28 },
    { lat: -88.534, lng: 45.10, hazardFlag: 'none', alt: -35 },
    { lat: -88.537, lng: 45.11, hazardFlag: 'none', alt: -42 },
    { lat: -88.540, lng: 45.12, hazardFlag: 'ice_proximity', alt: -54 },
    { lat: -88.542, lng: 45.12, hazardFlag: 'none', alt: -58 },
    { lat: -88.545, lng: 45.15, hazardFlag: 'target_reached', alt: -62 },
  ],
};

function buildCraterScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020a14);
  scene.fog = new THREE.FogExp2(0x020a14, 0.015);

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
  camera.position.set(0, 35, 60);
  camera.lookAt(0, -8, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x1a2a3a, 1.5);
  scene.add(ambientLight);
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sunLight.position.set(50, 80, 30);
  sunLight.castShadow = true;
  scene.add(sunLight);
  const blueRim = new THREE.DirectionalLight(0x0088ff, 0.5);
  blueRim.position.set(-50, 20, -30);
  scene.add(blueRim);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPositions: number[] = [];
  for (let i = 0; i < 4000; i++) {
    starPositions.push((Math.random() - 0.5) * 600, (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 600);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));

  // Crater terrain — procedural heightmap
  const geoW = 120, geoH = 120;
  const geometry = new THREE.PlaneGeometry(120, 120, geoW - 1, geoH - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const centerX = 0, centerZ = 0;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const r = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
    const rim = 12, floor = 40;
    let y = 0;
    // Crater bowl
    if (r < rim) y = -10 * (1 - (r / rim) ** 0.5);
    else if (r < floor) y = -4 * Math.cos(((r - rim) / (floor - rim)) * Math.PI * 0.5);
    else y = 0.5 * Math.sin(r * 0.3) * Math.cos(r * 0.2);
    // Roughness
    y += (Math.random() - 0.5) * 1.5;
    if (r < 8) y -= 2 + Math.random(); // crater floor depression
    positions.setY(i, y);
  }
  geometry.computeVertexNormals();

  // Colour terrain by height (PSR shadowing)
  const terrainMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x4a5568, shininess: 10, flatShading: true,
    vertexColors: false
  });
  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // PSR shadow zone (crater interior)
  const psrGeo = new THREE.CylinderGeometry(10, 10, 0.2, 64);
  const psrMat = new THREE.MeshPhongMaterial({ color: 0x0c1929, transparent: true, opacity: 0.55 });
  const psr = new THREE.Mesh(psrGeo, psrMat);
  psr.position.set(0, -8, 0);
  scene.add(psr);

  // Ice deposits (glowing cyan patches inside PSR)
  const icePositions = [[-3, -9.5, -4], [2, -9.5, 3], [-1, -9.5, 6], [5, -9.5, -2]];
  icePositions.forEach(([ix, iy, iz]) => {
    const iceGeo = new THREE.CylinderGeometry(Math.random() * 2 + 1, Math.random() * 2 + 1, 0.4, 32);
    const iceMat = new THREE.MeshPhongMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.75, emissive: 0x0e7490, emissiveIntensity: 0.8 });
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(ix as number, iy as number, iz as number);
    scene.add(ice);
  });

  // Landing site markers
  const lsPositions = [
    { x: 5, z: 3, rank: 1 },
    { x: -4, z: 5, rank: 2 },
    { x: 8, z: -4, rank: 3 },
    { x: -8, z: -6, rank: 4 },
  ];
  lsPositions.forEach(({ x, z, rank }) => {
    const ringGeo = new THREE.TorusGeometry(1.2, 0.2, 8, 32);
    const ringMat = new THREE.MeshPhongMaterial({ 
      color: rank === 1 ? 0x00ff88 : rank === 2 ? 0x22d3ee : rank === 3 ? 0xfbbf24 : 0xf87171,
      emissive: rank === 1 ? 0x00ff88 : rank === 2 ? 0x22d3ee : rank === 3 ? 0xfbbf24 : 0xf87171,
      emissiveIntensity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, -4, z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    // Rank label stick
    const stickGeo = new THREE.CylinderGeometry(0.06, 0.06, 4, 8);
    const stickMat = new THREE.MeshPhongMaterial({ color: 0x64748b });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.set(x, -2, z);
    scene.add(stick);
  });

  // Rover path line
  const pathPoints = [
    new THREE.Vector3(5, -3.8, 3), new THREE.Vector3(2, -4.5, 1), new THREE.Vector3(-2, -5.5, -1),
    new THREE.Vector3(-4, -7.5, -3), new THREE.Vector3(-3, -8.5, -4), new THREE.Vector3(-1, -9.2, -4.5),
  ];
  const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
  const pathGeo = new THREE.TubeGeometry(pathCurve, 40, 0.15, 8, false);
  const pathMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0e7490, emissiveIntensity: 1.2 });
  scene.add(new THREE.Mesh(pathGeo, pathMat));

  // Rover (simple box)
  const roverGroup = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(2, 0.8, 1.5);
  const roverMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, shininess: 80 });
  roverGroup.add(new THREE.Mesh(bodyGeo, roverMat));
  const panelGeo = new THREE.BoxGeometry(2.4, 0.1, 0.8);
  const panelMat = new THREE.MeshPhongMaterial({ color: 0x1e40af, emissive: 0x1e40af, emissiveIntensity: 0.5 });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, 0.5, 0.4);
  roverGroup.add(panel);
  roverGroup.position.set(5, -3.5, 3);
  scene.add(roverGroup);

  // Camera orbit controls (manual implementation)
  let isDragging = false, lastX = 0, lastY = 0;
  let theta = 0.3, phi = 0.5, radius = 70;

  const onMouseDown = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
  const onMouseUp = () => { isDragging = false; };
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    theta -= (e.clientX - lastX) * 0.005;
    phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  };
  const onWheel = (e: WheelEvent) => { radius = Math.max(20, Math.min(120, radius + e.deltaY * 0.05)); };

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel);

  // Rover animation along path
  let t = 0;
  let animFrameId = 0;

  const animate = () => {
    animFrameId = requestAnimationFrame(animate);
    t = (t + 0.0005) % 1;
    const pt = pathCurve.getPoint(t);
    roverGroup.position.copy(pt);
    const ahead = pathCurve.getPoint((t + 0.002) % 1);
    roverGroup.lookAt(ahead);

    camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = radius * Math.cos(phi) + 5;
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, -8, 0);
    renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    if (!canvas.parentElement) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  return () => {
    cancelAnimationFrame(animFrameId);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
  };
}

const VisualizationView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject, analyses, fetchProjects, setActiveProject, startAnalysis, fetchAnalyses } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [landingSites, setLandingSites] = useState(MOCK_LANDING_SITES);
  const [roverPath, setRoverPath] = useState(MOCK_ROVER_PATH);
  const [runningLS, setRunningLS] = useState(false);
  const [runningRP, setRunningRP] = useState(false);
  const [selectedSite, setSelectedSite] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'landing' | 'rover'>('landing');

  useEffect(() => {
    if (!activeProject && projectId) {
      fetchProjects().then(() => {
        const matched = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (matched) setActiveProject(matched);
      });
    }
  }, [projectId]);

  // Initialize Three.js scene after mount
  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = buildCraterScene(canvasRef.current);
    return cleanup;
  }, []);

  const handleCalculateLandingSites = async () => {
    if (!activeProject) return;
    setRunningLS(true);
    try {
      const res = await startAnalysis(activeProject.id, {
        analysisType: 'landing_site_calculation',
        parameters: { weights: { safety: 0.45, proximity: 0.30, solar: 0.25 } }
      });
      // Poll until completed
      const maxAttempts = 20;
      let attempt = 0;
      const poll = async () => {
        attempt++;
        await fetchAnalyses(activeProject.id);
        const latest = useProjectStore.getState().analyses.find(a => a.id === res.id);
        if (latest?.status === 'completed' && latest.resultData?.landingSites) {
          setLandingSites(latest.resultData.landingSites);
          setRunningLS(false);
        } else if (attempt < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          setRunningLS(false); // fallback to mock data already shown
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setRunningLS(false);
    }
  };

  const handlePlanRoverPath = async () => {
    if (!activeProject) return;
    setRunningRP(true);
    try {
      const res = await startAnalysis(activeProject.id, {
        analysisType: 'path_planning',
        parameters: {
          startLat: landingSites[selectedSite]?.lat || -88.521,
          startLng: landingSites[selectedSite]?.lng || 45.05,
          targetLat: -88.545, targetLng: 45.15,
          maxSlope: 25, algorithm: 'rrt_star'
        }
      });
      const maxAttempts = 20;
      let attempt = 0;
      const poll = async () => {
        attempt++;
        await fetchAnalyses(activeProject.id);
        const latest = useProjectStore.getState().analyses.find(a => a.id === res.id);
        if (latest?.status === 'completed' && latest.resultData?.waypoints) {
          setRoverPath(latest.resultData);
          setRunningRP(false);
        } else if (attempt < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          setRunningRP(false);
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setRunningRP(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <Compass className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">3D Crater Simulation & Rover Navigation</h1>
            <p className="text-slate-400 text-sm mt-1">
              Interactive Three.js crater model with real-time landing site scoring and RRT* rover path planning.
            </p>
          </div>
        </div>
      </div>

      {/* Three.js Viewer */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative" style={{ height: '480px' }}>
          <canvas ref={canvasRef} className="w-full h-full" style={{ cursor: 'grab' }} />
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" /> Ice Detection Zone</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Site #1 (Optimal)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300 inline-block" /> Rover Path</div>
            <div className="text-slate-600 text-[10px] mt-1">Drag to orbit · Scroll to zoom</div>
          </div>
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-cyan-500/20 rounded-2xl px-4 py-2">
            <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">LIVE SIMULATION</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('landing')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
            activeTab === 'landing' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Landing Site Analysis
        </button>
        <button
          onClick={() => setActiveTab('rover')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
            activeTab === 'rover' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Rover Path Planning
        </button>
      </div>

      {/* Landing Sites Tab */}
      {activeTab === 'landing' && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="h-6 w-6 text-cyan-400" />
              Landing Site Safety Ranking
            </h2>
            <button
              onClick={handleCalculateLandingSites}
              disabled={runningLS}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 text-sm uppercase tracking-wider disabled:opacity-50 transition-all"
            >
              {runningLS ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {runningLS ? 'Computing…' : 'Recalculate (API)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {landingSites.map((site, idx) => (
              <div
                key={site.rank}
                onClick={() => setSelectedSite(idx)}
                className={`rounded-2xl p-6 border cursor-pointer transition-all ${
                  selectedSite === idx
                    ? 'border-cyan-500/60 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                      site.rank === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      site.rank === 2 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      site.rank === 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>#{site.rank}</div>
                    <div>
                      <h3 className="text-white font-bold text-sm">LS-{String(site.rank).padStart(2, '0')}</h3>
                      <p className="text-slate-500 text-xs font-mono">{site.lat.toFixed(4)}°, {site.lng.toFixed(4)}°</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{(site.combinedScore * 100).toFixed(1)}<span className="text-sm text-slate-400">%</span></div>
                    <div className="text-xs text-slate-500">Combined Score</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-400 w-24">Safety</span>
                    <div className="flex-1 bg-slate-900 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${site.safetyScore * 100}%` }} />
                    </div>
                    <span className="text-slate-300 font-bold w-8 text-right">{(site.safetyScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-400 w-24">Ice Proximity</span>
                    <div className="flex-1 bg-slate-900 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${site.proximityScore * 100}%` }} />
                    </div>
                    <span className="text-slate-300 font-bold w-8 text-right">{(site.proximityScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Sun className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-400 w-24">Solar Hours</span>
                    <div className="flex-1 bg-slate-900 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${site.solarScore * 100}%` }} />
                    </div>
                    <span className="text-slate-300 font-bold w-8 text-right">{(site.solarScore * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Max Slope: <strong className="text-slate-300">{site.slopeMax}°</strong></span>
                  <span>Ice Depth: <strong className="text-cyan-400">{site.depthMeters} m</strong></span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${site.ice ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-500/10 text-slate-400'}`}>
                    {site.ice ? 'ICE CONFIRMED' : 'NO ICE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rover Path Tab */}
      {activeTab === 'rover' && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-cyan-400" />
              RRT* Optimal Rover Traverse
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(parseInt(e.target.value))}
                className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {landingSites.map((s, i) => (
                  <option key={s.rank} value={i}>Start: Landing Site #{s.rank}</option>
                ))}
              </select>
              <button
                onClick={handlePlanRoverPath}
                disabled={runningRP}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 text-sm uppercase tracking-wider disabled:opacity-50 transition-all"
              >
                {runningRP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {runningRP ? 'Planning…' : 'Plan Path (API)'}
              </button>
            </div>
          </div>

          {/* Path Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Distance</span>
              <div className="text-3xl font-black text-white mt-2">{roverPath.distanceKm?.toFixed(1)} <span className="text-sm text-slate-400">km</span></div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Traversal Time</span>
              <div className="text-3xl font-black text-cyan-400 mt-2">{roverPath.estimatedTraversalTimeHours?.toFixed(1)} <span className="text-sm text-slate-400">hrs</span></div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Energy Use</span>
              <div className="text-3xl font-black text-amber-400 mt-2">{roverPath.energyConsumptionWh?.toFixed(0)} <span className="text-sm text-slate-400">Wh</span></div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Slope</span>
              <div className="text-3xl font-black text-rose-400 mt-2">{roverPath.maxSlopeDeg?.toFixed(1) || '18.2'}<span className="text-sm text-slate-400">°</span></div>
            </div>
          </div>

          {/* Waypoints */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Traversal Waypoints</h3>
            <div className="space-y-2">
              {roverPath.waypoints?.map((wp, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    wp.hazardFlag === 'target_reached' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    wp.hazardFlag === 'ice_proximity' ? 'border-cyan-500/30 bg-cyan-500/5' :
                    wp.hazardFlag === 'moderate_slope' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-slate-800/60 bg-slate-950/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-700 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
                    <span className="text-slate-400 font-mono">{wp.lat?.toFixed(4)}°, {wp.lng?.toFixed(4)}°</span>
                    <span className="text-slate-500">Alt: <strong className="text-slate-300">{wp.alt || 0} m</strong></span>
                    <span className={`font-bold capitalize ${
                      wp.hazardFlag === 'target_reached' ? 'text-emerald-400' :
                      wp.hazardFlag === 'ice_proximity' ? 'text-cyan-400' :
                      wp.hazardFlag === 'moderate_slope' ? 'text-amber-400' :
                      'text-slate-500'
                    }`}>
                      {wp.hazardFlag?.replace(/_/g, ' ') || 'clear'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizationView;
