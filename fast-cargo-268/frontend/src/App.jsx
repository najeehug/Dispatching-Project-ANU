import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/AuthContext';

import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import TrackPage         from './pages/TrackPage';
import PinDropPage       from './pages/PinDropPage';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard   from './pages/DriverDashboard';
import DispatchDashboard from './pages/DispatchDashboard';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role === 'DISPATCHER') return <Navigate to="/dispatch"  replace />;
  if (user.role === 'DRIVER')     return <Navigate to="/driver"    replace />;
  return <Navigate to="/dashboard" replace />;
}

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/register"       element={<RegisterPage />} />
            <Route path="/track"          element={<TrackPage />} />
            <Route path="/track/:number"  element={<TrackPage />} />
            <Route path="/pin/:packageId" element={<PinDropPage />} />
            <Route path="/"               element={<RoleRedirect />} />
            <Route path="/dashboard"      element={<Guard role="CUSTOMER"><CustomerDashboard /></Guard>} />
            <Route path="/driver"         element={<Guard role="DRIVER"><DriverDashboard /></Guard>} />
            <Route path="/dispatch"       element={<Guard role="DISPATCHER"><DispatchDashboard /></Guard>} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
