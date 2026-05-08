import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { AppHomePage } from '../features/app/pages/AppHomePage';
import { MapDashboardPage } from '../features/app/pages/MapDashboardPage';
import { WaterObjectsPage } from '../features/water-objects/pages/WaterObjectsPage';
import { FishPhaseOnePage } from '../features/fish/pages/FishPhaseOnePage';
import { FishStockPage } from '../features/fish/pages/FishStockPage';
import { FishEntryFormPage } from '../features/fish/pages/FishEntryFormPage';
import { PondDetailPage } from '../features/water-objects/pages/PondDetailPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={<Navigate to="/app/map" replace />}
      />
      <Route
        path="/app/home"
        element={
          <ProtectedRoute>
            <AppHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/map"
        element={
          <ProtectedRoute>
            <MapDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/water-objects"
        element={
          <ProtectedRoute>
            <WaterObjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/fish"
        element={
          <ProtectedRoute>
            <FishPhaseOnePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/fish-stock"
        element={
          <ProtectedRoute>
            <FishStockPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/fish-entry/new"
        element={
          <ProtectedRoute>
            <FishEntryFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/ponds/:id"
        element={
          <ProtectedRoute>
            <PondDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
