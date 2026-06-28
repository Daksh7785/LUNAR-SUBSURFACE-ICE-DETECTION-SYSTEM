import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import AnalysisView from './pages/AnalysisView';
import VisualizationView from './pages/VisualizationView';
import MissionControl from './pages/MissionControl';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore(state => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const token = useAuthStore(state => state.token);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
        {token && <Sidebar />}
        <div className="flex flex-col flex-1 overflow-hidden">
          {token && <Navbar />}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/50">
            <Routes>
              <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />
              <Route path="/projects/:projectId/mission-control" element={<ProtectedRoute><MissionControl /></ProtectedRoute>} />
              <Route path="/projects/:projectId/analysis" element={<ProtectedRoute><AnalysisView /></ProtectedRoute>} />
              <Route path="/projects/:projectId/visualize" element={<ProtectedRoute><VisualizationView /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
