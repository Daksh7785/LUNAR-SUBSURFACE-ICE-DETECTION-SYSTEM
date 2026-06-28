import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { register, login, refresh, logout } from '../controllers/authController';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../controllers/projectController';
import { uploadDataset, getDatasets, getDatasetById } from '../controllers/datasetController';
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
