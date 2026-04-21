import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { AppHomePage } from '../features/app/pages/AppHomePage';
import { WaterObjectsPage } from '../features/water-objects/pages/WaterObjectsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppHomePage />
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
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
