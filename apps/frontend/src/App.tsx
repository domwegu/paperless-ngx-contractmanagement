import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import ContractsPage      from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';
import ContractFormPage   from './pages/ContractFormPage';
import RemindersPage      from './pages/RemindersPage';
import SettingsPage       from './pages/SettingsPage';
import UsersPage          from './pages/UsersPage';
import TenantsPage        from './pages/TenantsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
      <Route path="/contracts/new" element={<ProtectedRoute><ContractFormPage /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetailPage /></ProtectedRoute>} />
      <Route path="/contracts/:id/edit" element={<ProtectedRoute><ContractFormPage /></ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
      <Route path="/tenants"  element={<ProtectedRoute><TenantsPage /></ProtectedRoute>} />
      <Route path="/users"    element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
