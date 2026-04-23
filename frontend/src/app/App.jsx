import { AppRoutes } from './AppRoutes';
import { MainLayout } from '../shared/layout/MainLayout';

export function App() {
  return (
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  );
}
