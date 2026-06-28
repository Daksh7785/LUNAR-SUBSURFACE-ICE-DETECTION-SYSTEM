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
}

const getHeaders = () => ({
  Authorization: `Bearer ${useAuthStore.getState().token}`,
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
      set({ projects: res.data.data, loading: false, isLoading: false });
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
      set({ datasets: res.data.data, loading: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch datasets', loading: false, isLoading: false });
    }
  },

  fetchAnalyses: async (projectId) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.get(`/api/v1/projects/${projectId}/analysis`, { headers: getHeaders() });
      set({ analyses: res.data.data, loading: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch analyses', loading: false, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.post('/api/v1/projects', data, { headers: getHeaders() });
      const newProject = res.data.data;
      set((state) => ({ projects: [...state.projects, newProject], loading: false, isLoading: false }));
      return newProject;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create project', loading: false, isLoading: false });
      throw err;
    }
  },

  startAnalysis: async (projectId, data) => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/v1/projects/${projectId}/analysis`, data, { headers: getHeaders() });
      const newAnalysis = res.data.data;
      set((state) => ({ analyses: [newAnalysis, ...state.analyses], loading: false, isLoading: false }));
      return newAnalysis;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to start analysis', loading: false, isLoading: false });
      throw err;
    }
  },
}));
