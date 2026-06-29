import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

export interface Project {
  id: string;
  name: string;
  description?: string;
  targetRegion: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  latitude?: number;
  longitude?: number;
  status?: 'ready' | 'processing' | 'completed' | 'draft' | 'in_progress';
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  type: string;
  fileUrl: string;
  createdAt: string;
}

export interface AnalysisResult {
  id: string;
  projectId: string;
  datasetId?: string;
  analysisType: string;
  parameters: Record<string, any>;
  status: string;
  resultData?: any;
  confidenceScore?: number;
  errorMessage?: string;
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  datasets: Dataset[];
  analyses: AnalysisResult[];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  setActiveProject: (projectOrId: Project | string | null) => void;
  fetchDatasets: (projectId: string) => Promise<void>;
  fetchAnalyses: (projectId: string) => Promise<void>;
  createProject: (data: { name: string; description: string; targetRegion: string; coordinates: { lat: number; lng: number } }) => Promise<Project>;
  startAnalysis: (projectId: string, data: { datasetId?: string; analysisType: string; parameters: any }) => Promise<AnalysisResult>;
  ingestDataset: (projectId: string, data: { name: string; type: string; fileUrl: string }) => Promise<Dataset>;
}

const getHeaders = () => ({
  Authorization: `Bearer ${useAuthStore.getState().token}`,
});

// Normalize a raw API project row (snake_case or camelCase) → Project interface
const formatProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  // Backend uses crater_name; frontend may also send targetRegion
  targetRegion: row.crater_name || row.targetRegion || row.craterName || 'Lunar South Pole',
  coordinates: {
    lat: row.latitude ?? row.coordinates?.lat ?? 0,
    lng: row.longitude ?? row.coordinates?.lng ?? 0,
  },
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  status: row.status || 'in_progress',
});

// Map raw database rows (snake_case) to frontend camelCase Dataset interface
const formatDataset = (row: any): Dataset => ({
  id: row.id,
  projectId: row.project_id || row.projectId,
  name: row.filename || row.name || row.dataset_type,
  type: row.dataset_type || row.type,
  fileUrl: row.file_url || row.fileUrl || '',
  createdAt: row.uploaded_at || row.createdAt || new Date().toISOString(),
});

// Map raw database rows to frontend camelCase AnalysisResult interface
const formatAnalysis = (row: any): AnalysisResult => ({
  id: row.id,
  projectId: row.project_id || row.projectId,
  datasetId: row.dataset_id || row.datasetId,
  analysisType: row.analysis_type || row.analysisType,
  parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : (row.parameters || {}),
  status: row.status,
  resultData: typeof row.result_data === 'string' ? JSON.parse(row.result_data) : (row.result_data || row.resultData),
  confidenceScore: row.confidence_score || row.confidenceScore,
  errorMessage: row.error_message || row.errorMessage,
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
});

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  datasets: [],
  analyses: [],
  loading: false,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.get('/api/v1/projects', { headers: getHeaders() });
      const raw: any[] = res.data.data || res.data.projects || [];
      const projects = raw.map(formatProject);
      set({ projects, loading: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', loading: false, isLoading: false });
    }
  },

  setActiveProject: (projectOrId) => {
    let project: Project | null = null;
    if (typeof projectOrId === 'string') {
      project = get().projects.find(p => p.id === projectOrId) || null;
    } else {
      project = projectOrId;
    }
    set({ activeProject: project });
    if (project) {
      get().fetchDatasets(project.id);
      get().fetchAnalyses(project.id);
    } else {
      set({ datasets: [], analyses: [] });
    }
  },

  fetchDatasets: async (projectId) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.get(`/api/v1/projects/${projectId}/datasets`, { headers: getHeaders() });
      const raw = res.data.data || res.data.datasets || [];
      set({ datasets: raw.map(formatDataset), loading: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch datasets', loading: false, isLoading: false });
    }
  },

  fetchAnalyses: async (projectId) => {
    // Don't show global loading for polling
    try {
      const res = await axios.get(`/api/v1/projects/${projectId}/analysis`, { headers: getHeaders() });
      const raw = res.data.data || res.data.analysisResults || [];
      set({ analyses: raw.map(formatAnalysis), loading: false, isLoading: false });
    } catch (err: any) {
      set({ loading: false, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.post('/api/v1/projects', {
        name: data.name,
        description: data.description,
        craterName: data.targetRegion,
        latitude: data.coordinates.lat,
        longitude: data.coordinates.lng,
      }, { headers: getHeaders() });
      const raw = res.data.data || res.data.project || res.data;
      const newProject = formatProject(raw);
      set((state) => ({ projects: [...state.projects, newProject], loading: false, isLoading: false }));
      return newProject;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create project', loading: false, isLoading: false });
      throw err;
    }
  },

  startAnalysis: async (projectId, data) => {
    set({ loading: false, isLoading: false, error: null });
    try {
      const res = await axios.post(`/api/v1/projects/${projectId}/analysis`, data, { headers: getHeaders() });
      const newAnalysis = formatAnalysis(res.data.data || res.data);
      set((state) => ({ analyses: [newAnalysis, ...state.analyses] }));
      return newAnalysis;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to start analysis' });
      throw err;
    }
  },

  ingestDataset: async (projectId, data) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/v1/projects/${projectId}/datasets`, {
        name: data.name,
        type: data.type,
        fileUrl: data.fileUrl,
        datasetType: data.type,
        filename: data.name,
      }, { headers: getHeaders() });
      const raw = res.data.dataset || res.data.data || res.data;
      const newDataset = formatDataset(raw);
      set((state) => ({ datasets: [newDataset, ...state.datasets], loading: false, isLoading: false }));
      return newDataset;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to ingest dataset', loading: false, isLoading: false });
      throw err;
    }
  },
}));
