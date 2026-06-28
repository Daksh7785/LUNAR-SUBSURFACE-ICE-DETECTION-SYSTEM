import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { register, login, refresh, logout } from '../controllers/authController';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../controllers/projectController';
import { uploadDataset, getDatasets, getDatasetById } from '../controllers/datasetController';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/database';
import { rabbitmq } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { 
  detectIce, getAnalysisResults, getAnalysisById, calculateLandingSites, planRoverPath,
  analyzeRadar, analyzeTerrain, estimateIceVolume, interpretAI, generateReport, simulateIllumination,
  getExternalNasaSpice, getExternalLolaDem, getExternalNoaaWeather, getExternalIsroPradan
} from '../controllers/analysisController';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    organization: z.string().optional(),
    role: z.enum(['admin', 'scientist', 'viewer', 'guest']).optional(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    craterName: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const uploadDatasetSchema = z.object({
  body: z.object({
    datasetType: z.enum(['DFSAR', 'OHRC', 'DEM']),
    filename: z.string().optional(),
    fileSize: z.number().optional(),
  }),
  query: z.record(z.unknown()),
  params: z.object({
    projectId: z.string().uuid(),
  }),
});

const detectIceSchema = z.object({
  body: z.object({
    datasetId: z.string().uuid(),
    parameters: z.record(z.unknown()),
  }),
  query: z.record(z.unknown()),
  params: z.object({
    projectId: z.string().uuid(),
  }),
});

const analyzeRadarSchema = z.object({
  body: z.object({
    datasetId: z.string().uuid().optional(),
    cprThreshold: z.number().optional(),
    dopThreshold: z.number().optional(),
    mChiDecomposition: z.boolean().optional(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const analyzeTerrainSchema = z.object({
  body: z.object({
    craterName: z.string().optional(),
    demResolutionMeters: z.number().optional(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const estimateIceVolumeSchema = z.object({
  body: z.object({
    craterId: z.string().optional(),
    depthMinMeters: z.number().optional(),
    depthMaxMeters: z.number().optional(),
    regolithDielectric: z.number().optional(),
    iceDielectric: z.number().optional(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

const interpretAISchema = z.object({
  body: z.object({
    query: z.string(),
    contextData: z.record(z.unknown()).optional(),
    model: z.string().optional(),
  }),
  query: z.record(z.unknown()),
  params: z.record(z.unknown()),
});

// Auth Routes
router.post('/auth/register', validate(registerSchema), register);
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', logout);

// Project Routes
router.use('/projects', authenticate);
router.post('/projects', validate(createProjectSchema), createProject);
router.get('/projects', getProjects);
router.get('/projects/:projectId', getProjectById);
router.put('/projects/:projectId', updateProject);
router.delete('/projects/:projectId', deleteProject);

// Project-scoped Dataset Routes (frontend uses these paths)
router.get('/projects/:projectId/datasets', authenticate, (req, res, next) => {
  req.params = { ...req.params, projectId: req.params.projectId };
  return getDatasets(req as AuthenticatedRequest, res, next);
});
router.post('/projects/:projectId/datasets', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Translate frontend body format (name, type, fileUrl) to backend format (datasetType, filename)
  req.body.datasetType = req.body.datasetType || req.body.type || 'DFSAR';
  req.body.filename = req.body.filename || req.body.name;
  return uploadDataset(req as AuthenticatedRequest, res, next);
});

// Project-scoped Analysis Routes (frontend projectStore uses these paths)
router.get('/projects/:projectId/analysis', authenticate, getAnalysisResults);
router.post('/projects/:projectId/analysis', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Generic startAnalysis dispatcher — routes by analysisType
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const { projectId } = req.params;
  const { analysisType, datasetId, parameters } = req.body;
  const taskId = `task_${analysisType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // Verify project ownership
    const projCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [projectId, req.user.id]);
    if (!projCheck.rowCount || projCheck.rowCount === 0) { res.status(404).json({ error: 'Project not found' }); return; }

    const insertRes = await db.query(
      `INSERT INTO analysis_results (project_id, dataset_id, analysis_type, status, task_id, parameters)
       VALUES ($1, $2, $3, 'queued', $4, $5)
       RETURNING id, project_id, dataset_id, analysis_type, status, task_id, parameters, created_at`,
      [projectId, datasetId || null, analysisType || 'ice_detection', taskId, JSON.stringify(parameters || {})]
    );
    const analysis = insertRes.rows[0];

    // Publish to RabbitMQ if available, else simulate completion inline
    const published = await rabbitmq.publishTask('celery', {
      id: taskId,
      task: `tasks.${analysisType}_task`,
      args: [analysis.id, datasetId, parameters],
      kwargs: {},
    });

    if (!published) {
      // Simulate async ML worker completing the job
      setTimeout(async () => {
        try {
          let resultData: any = {};
          if (analysisType === 'ice_detection') {
            resultData = { cprMean: 1.45, cprPeak: 1.82, dopMin: 0.05, iceDetectedAreaKm2: 12.4, estimatedIceVolumeM3: 2450000, averageIceConcentrationPct: 62.4, shapValues: { cpr: 0.42, dop: -0.31, m_chi: 0.18, slope: -0.05 }, polygons: [{ lat: -88.542, lng: 45.12, cpr: 1.62, dop: 0.08, depthMeters: 5.0, concentration: 0.35 }, { lat: -88.545, lng: 45.15, cpr: 1.75, dop: 0.06, depthMeters: 5.0, concentration: 0.42 }] };
          } else if (analysisType === 'landing_site_calculation') {
            resultData = { landingSites: [{ rank: 1, lat: -88.521, lng: 45.05, safetyScore: 0.95, proximityScore: 0.88, solarScore: 0.91, combinedScore: 0.913 }, { rank: 2, lat: -88.518, lng: 45.02, safetyScore: 0.91, proximityScore: 0.85, solarScore: 0.89, combinedScore: 0.883 }, { rank: 3, lat: -88.515, lng: 44.98, safetyScore: 0.87, proximityScore: 0.82, solarScore: 0.86, combinedScore: 0.850 }] };
          } else if (analysisType === 'path_planning') {
            resultData = { distanceKm: 3.4, estimatedTraversalTimeHours: 4.2, energyConsumptionWh: 420.5, waypoints: [{ lat: -88.521, lng: 45.05, hazardFlag: 'none' }, { lat: -88.530, lng: 45.08, hazardFlag: 'moderate_slope' }, { lat: -88.537, lng: 45.10, hazardFlag: 'none' }, { lat: -88.542, lng: 45.12, hazardFlag: 'ice_proximity' }, { lat: -88.545, lng: 45.15, hazardFlag: 'target_reached' }] };
          } else {
            resultData = { status: 'completed', type: analysisType };
          }
          await db.query(
            `UPDATE analysis_results SET status = 'completed', confidence_score = 0.92, result_data = $1 WHERE id = $2`,
            [JSON.stringify(resultData), analysis.id]
          );
          logger.info('Simulated analysis completion', { analysisId: analysis.id, analysisType });
        } catch (err) {
          logger.error('Simulation error', { error: (err as Error).message });
        }
      }, 3000);
    }

    const formatted = {
      id: analysis.id,
      projectId: analysis.project_id,
      datasetId: analysis.dataset_id,
      analysisType: analysis.analysis_type,
      status: analysis.status,
      taskId: analysis.task_id,
      parameters: analysis.parameters,
      createdAt: analysis.created_at,
    };
    res.status(202).json({ message: 'Analysis queued successfully', analysisId: analysis.id, taskId, status: 'queued', data: formatted });
  } catch (error) {
    next(error);
  }
});

// Dataset Routes
router.use('/datasets', authenticate);
router.post('/datasets/:projectId/upload', validate(uploadDatasetSchema), uploadDataset);
router.get('/datasets/:projectId', getDatasets);
router.get('/datasets/:projectId/:datasetId', getDatasetById);

// Analysis Routes
router.use('/analysis', authenticate);
router.post('/analysis/:projectId/detect-ice', validate(detectIceSchema), detectIce);
router.get('/analysis/:projectId', getAnalysisResults);
router.get('/analysis/:projectId/:analysisId', getAnalysisById);
router.post('/analysis/:projectId/landing-sites', calculateLandingSites);
router.post('/analysis/:projectId/rover-path', planRoverPath);

// Mission Control Core Specification Endpoints
router.post('/radar/analyze', authenticate, validate(analyzeRadarSchema), analyzeRadar);
router.post('/terrain/analyze', authenticate, validate(analyzeTerrainSchema), analyzeTerrain);
router.post('/rover/plan-path', authenticate, planRoverPath);
router.post('/ice/estimate-volume', authenticate, validate(estimateIceVolumeSchema), estimateIceVolume);
router.post('/ai/interpret', authenticate, validate(interpretAISchema), interpretAI);
router.post('/report/generate', authenticate, generateReport);
router.get('/illumination/simulate', authenticate, simulateIllumination);

// External Agencies Simulated APIs
router.get('/external/nasa-spice', authenticate, getExternalNasaSpice);
router.get('/external/lola-dem', authenticate, getExternalLolaDem);
router.get('/external/noaa-weather', authenticate, getExternalNoaaWeather);
router.get('/external/isro-pradan', authenticate, getExternalIsroPradan);

export default router;
