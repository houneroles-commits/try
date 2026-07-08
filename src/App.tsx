import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Assistant from './pages/Assistant';
import Weather from './pages/Weather';
import Settings from './pages/Settings';
import Irrigation from './pages/Irrigation';
import Calendar from './pages/Calendar';
import Records from './pages/Records';
import Prices from './pages/Prices';
import Fertilizer from './pages/Fertilizer';
import Pests from './pages/Pests';
import Finance from './pages/Finance';
import Onboarding from './pages/Onboarding';
import { Skeleton } from './components/ui';
import { useApp } from './state/AppContext';

// Charts (recharts) are heavy — only download them when Data is opened
const Data = lazy(() => import('./pages/Data'));

function DataFallback() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-5 space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10" />
      <Skeleton className="h-[260px]" />
    </div>
  );
}

export default function App() {
  const { settings } = useApp();
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            settings.onboarded ? <Home /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/weather" element={<Weather />} />
        <Route
          path="/data"
          element={
            <Suspense fallback={<DataFallback />}>
              <Data />
            </Suspense>
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/irrigation" element={<Irrigation />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/records" element={<Records />} />
        <Route path="/prices" element={<Prices />} />
        <Route path="/fertilizer" element={<Fertilizer />} />
        <Route path="/pests" element={<Pests />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
