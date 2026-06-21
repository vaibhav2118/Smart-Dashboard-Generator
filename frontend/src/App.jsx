import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Upload from './pages/Upload';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Datasets from './pages/Datasets';
import DatasetPreview from './pages/DatasetPreview';
import DataProfiling from './pages/DataProfiling';
import AIInsights from './pages/AIInsights';
import Forecasting from './pages/Forecasting';
import DashboardStudio from './pages/DashboardStudio';
import DataPreparation from './pages/DataPreparation';
import ReportBuilder from './pages/ReportBuilder';
import PublicDashboard from './pages/PublicDashboard';
import Chat from './pages/Chat';
import CommandCenter from './pages/CommandCenter';
import ExecutiveBrief from './pages/ExecutiveBrief';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/share/:token" element={<PublicDashboard />} />
      
      {/* Protected Routes (under layout) */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/dataset/:id" element={<DatasetPreview />} />
        <Route path="/dataset/:id/prepare" element={<DataPreparation />} />
        <Route path="/analysis/:id" element={<DataProfiling />} />
        <Route path="/insights/:id" element={<AIInsights />} />
        <Route path="/forecast/:id" element={<Forecasting />} />
        <Route path="/dashboard/:datasetId" element={<DashboardStudio />} />
        <Route path="/report-builder/:datasetId" element={<ReportBuilder />} />
        <Route path="/chat/:datasetId" element={<Chat />} />
        <Route path="/command-center/:datasetId" element={<CommandCenter />} />
        <Route path="/executive-brief/:datasetId" element={<ExecutiveBrief />} />
      </Route>

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
