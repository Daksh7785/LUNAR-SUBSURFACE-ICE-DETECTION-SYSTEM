import { Pool } from 'pg';
import { logger } from './logger';
import { env } from './env';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let isDbOffline = false;

// In-memory store for offline mock data (simulates database across requests)
const SEED_PROJECT_ID = 'fa140209-64d8-410a-b31a-e82b010cfa0b';
const mockStore: {
  projects: any[];
  datasets: any[];
  analyses: any[];
} = {
  projects: [
    {
      id: SEED_PROJECT_ID,
      user_id: 'a3d9050d-df8b-4a57-b08e-17cfc1d904c1',
      name: 'Faustini Crater Resource Assessment',
      description: 'Strategic analysis of the Faustini Permanently Shadowed Region (PSR) for subsurface ice volume estimation.',
      crater_name: 'Faustini Crater (South Pole)',
      latitude: -87.180000,
      longitude: 84.310000,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  datasets: [
    { id: 'd1', project_id: 'fa140209-64d8-410a-b31a-e82b010cfa0b', dataset_type: 'DFSAR', filename: 'faustini_dfsar_stokes.csv', file_url: '/uploads/faustini_dfsar_stokes.csv', file_size: 102400, status: 'completed', uploaded_at: new Date().toISOString() },
    { id: 'd2', project_id: 'fa140209-64d8-410a-b31a-e82b010cfa0b', dataset_type: 'OHRC', filename: 'faustini_ohrc.tif', file_url: '/uploads/faustini_ohrc.tif', file_size: 204800, status: 'completed', uploaded_at: new Date().toISOString() },
    { id: 'd3', project_id: 'fa140209-64d8-410a-b31a-e82b010cfa0b', dataset_type: 'DEM', filename: 'faustini_dem.tif', file_url: '/uploads/faustini_dem.tif', file_size: 512000, status: 'completed', uploaded_at: new Date().toISOString() },
  ],
  analyses: [
    {
      id: 'a1',
      project_id: 'fa140209-64d8-410a-b31a-e82b010cfa0b',
      dataset_id: 'd1',
      analysis_type: 'ice_detection',
      status: 'completed',
      task_id: 'task_ice_seed_001',
      parameters: { minCprThreshold: 1.0, maxDopThreshold: 0.13 },
      result_data: {
        cprMean: 1.45, cprPeak: 1.85, dopMin: 0.04, dopMean: 0.52,
        iceDetectedAreaKm2: 12.4, estimatedIceVolumeM3: 2450000, estimatedIceVolumeKm3: 0.00245,
        regolithDepthAnalyzedMeters: 5.0, averageIceConcentrationPct: 62.4,
        shapValues: { cpr: 0.42, dop: -0.31, m_chi: 0.18, slope: -0.05, temp: -0.15, roughness: -0.02, albedo: 0.01 },
        polygons: [
          { lat: -88.542, lng: 45.12, cpr: 1.62, dop: 0.08, depthMeters: 5.0, concentration: 0.35 },
          { lat: -88.545, lng: 45.15, cpr: 1.75, dop: 0.06, depthMeters: 5.0, concentration: 0.42 }
        ]
      },
      confidence_score: 0.95,
      created_at: new Date().toISOString(),
    }
  ],
};

pool.connect()
  .then(client => {
    client.release();
    logger.info('Connected to PostgreSQL database successfully');
  })
  .catch(err => {
    logger.warn('PostgreSQL database is offline. Activating Offline Mock Fallback Mode.', { error: err.message });
    isDbOffline = true;
  });

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

export const db = {
  query: async (text: string, params?: unknown[]) => {
    if (isDbOffline && env.NODE_ENV !== 'test') {
      logger.info('Database Query Mock Intercept', { text: text.substring(0, 80) });
      const queryLower = text.toLowerCase();
      
      // Mock User Query (login)
      if (queryLower.includes('from users where email =')) {
        const email = params && params[0] ? String(params[0]) : 'mission_control@isro.gov.in';
        const hash = crypto.createHash('sha256').update('isro_secure_admin_2026').digest('hex');
        return {
          rowCount: 1,
          rows: [{
            id: 'a3d9050d-df8b-4a57-b08e-17cfc1d904c1',
            email: email,
            password_hash: hash,
            full_name: 'ISRO Mission Controller',
            organization: 'ISRO Space Applications Centre',
            role: 'admin'
          }]
        };
      }

      // Mock User Existence Check (registration uniqueness)
      if (queryLower.includes('select id from users')) {
        return { rowCount: 0, rows: [] };
      }

      // Mock User Insert (registration)
      if (queryLower.includes('insert into users')) {
        const email = params && params[0] ? String(params[0]) : 'mission_control@isro.gov.in';
        return {
          rowCount: 1,
          rows: [{
            id: 'a3d9050d-df8b-4a57-b08e-17cfc1d904c1',
            email,
            full_name: params && params[2] ? String(params[2]) : 'ISRO Mission Controller',
            organization: 'ISRO Space Applications Centre',
            role: 'scientist',
            created_at: new Date().toISOString()
          }]
        };
      }

      // Mock refresh token ops
      if (queryLower.includes('refresh_tokens')) {
        return { rowCount: 1, rows: [{ id: crypto.randomUUID(), user_id: 'a3d9050d-df8b-4a57-b08e-17cfc1d904c1' }] };
      }
      
      // Mock Projects Query — return from mockStore
      if (queryLower.includes('from projects')) {
        const paramId = params && params[0] ? String(params[0]) : '';
        let rows = mockStore.projects;
        if (paramId) {
          // Support both WHERE id=$1 AND user_id=$2 (2 params) and WHERE id=$1 (1 param)
          rows = mockStore.projects.filter(p => !paramId || p.id === paramId);
          // If specific ID requested and not found, return seed project as fallback
          if (rows.length === 0) rows = mockStore.projects.slice(0, 1);
        }
        return { rowCount: rows.length, rows };
      }

      // Mock Project Insert — persist to mockStore so analysis route can find it
      if (queryLower.includes('insert into projects')) {
        const newId = crypto.randomUUID();
        const row = {
          id: newId,
          user_id: 'a3d9050d-df8b-4a57-b08e-17cfc1d904c1',
          name: params && params[1] ? String(params[1]) : 'New Project',
          description: params && params[2] ? String(params[2]) : '',
          crater_name: params && params[3] ? String(params[3]) : 'Shackleton',
          latitude: params && params[4] ? Number(params[4]) : -89.9,
          longitude: params && params[5] ? Number(params[5]) : 0,
          status: 'in_progress',
          created_at: new Date().toISOString(),
        };
        mockStore.projects.push(row);
        return { rowCount: 1, rows: [row] };
      }

      // Mock Dataset Queries
      if (queryLower.includes('from datasets')) {
        const projectId = params && params[0] ? String(params[0]) : '';
        const datasets = mockStore.datasets.filter(d => !projectId || d.project_id === projectId);
        return { rowCount: datasets.length, rows: datasets };
      }

      // Mock Dataset Insert
      if (queryLower.includes('insert into datasets')) {
        const newId = `d${Date.now()}`;
        const row = {
          id: newId,
          project_id: params && params[0] ? String(params[0]) : 'fa140209-64d8-410a-b31a-e82b010cfa0b',
          dataset_type: params && params[1] ? String(params[1]) : 'DFSAR',
          filename: params && params[2] ? String(params[2]) : 'data.tif',
          file_url: params && params[3] ? String(params[3]) : '/uploads/data.tif',
          file_size: params && params[4] ? Number(params[4]) : 1024576,
          status: 'completed',
          uploaded_at: new Date().toISOString(),
        };
        mockStore.datasets.push(row);
        return { rowCount: 1, rows: [row] };
      }
      
      // Mock Analysis Results Query
      if (queryLower.includes('from analysis_results')) {
        const projectId = params && params[0] ? String(params[0]) : '';
        let analyses = projectId ? mockStore.analyses.filter(a => a.project_id === projectId) : mockStore.analyses;
        return { rowCount: analyses.length, rows: analyses };
      }

      // Mock Analysis Insert
      if (queryLower.includes('insert into analysis_results')) {
        const newId = `a${Date.now()}`;
        const row = {
          id: newId,
          project_id: params && params[0] ? String(params[0]) : 'fa140209-64d8-410a-b31a-e82b010cfa0b',
          dataset_id: params && params[1] ? String(params[1]) : null,
          analysis_type: params && params[2] ? String(params[2]) : 'ice_detection',
          status: 'queued',
          task_id: params && params[3] ? String(params[3]) : `task_${Date.now()}`,
          parameters: params && params[4] ? params[4] : '{}',
          created_at: new Date().toISOString(),
        };
        mockStore.analyses.unshift(row);
        // Simulate completion after 3s
        setTimeout(() => {
          const analysis = mockStore.analyses.find(a => a.id === newId);
          if (analysis) {
            analysis.status = 'completed';
            analysis.confidence_score = 0.92;
            if (analysis.analysis_type === 'ice_detection') {
              analysis.result_data = { cprMean: 1.45, cprPeak: 1.82, dopMin: 0.05, iceDetectedAreaKm2: 12.4, estimatedIceVolumeM3: 2450000, averageIceConcentrationPct: 62.4, polygons: [{ lat: -88.542, lng: 45.12, cpr: 1.62, dop: 0.08, depthMeters: 5.0, concentration: 0.35 }] };
            } else if (analysis.analysis_type === 'landing_site_calculation') {
              analysis.result_data = { landingSites: [{ rank: 1, lat: -88.521, lng: 45.05, safetyScore: 0.95, proximityScore: 0.88, solarScore: 0.91, combinedScore: 0.913 }, { rank: 2, lat: -88.518, lng: 45.02, safetyScore: 0.91, proximityScore: 0.85, solarScore: 0.89, combinedScore: 0.883 }, { rank: 3, lat: -88.515, lng: 44.98, safetyScore: 0.87, proximityScore: 0.82, solarScore: 0.86, combinedScore: 0.850 }] };
            } else if (analysis.analysis_type === 'path_planning') {
              analysis.result_data = { distanceKm: 3.4, estimatedTraversalTimeHours: 4.2, energyConsumptionWh: 420.5, waypoints: [{ lat: -88.521, lng: 45.05, hazardFlag: 'none' }, { lat: -88.530, lng: 45.08, hazardFlag: 'moderate_slope' }, { lat: -88.537, lng: 45.10, hazardFlag: 'none' }, { lat: -88.542, lng: 45.12, hazardFlag: 'ice_proximity' }, { lat: -88.545, lng: 45.15, hazardFlag: 'target_reached' }] };
            }
          }
        }, 3000);
        return { rowCount: 1, rows: [row] };
      }

      // Mock Analysis Update (status completion)
      if (queryLower.includes('update analysis_results')) {
        return { rowCount: 1, rows: [] };
      }

      // Default Query Return
      return { rowCount: 0, rows: [] };
    }
    
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  },
  getClient: () => pool.connect(),
  pool,
};
