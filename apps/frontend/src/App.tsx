import { Routes, Route, Navigate } from 'react-router-dom'

// Seiten (werden in den nächsten Schritten implementiert)
// import LoginPage       from './pages/LoginPage'
// import DashboardPage   from './pages/DashboardPage'
// import ContractsPage   from './pages/ContractsPage'
// import ContractDetail  from './pages/ContractDetailPage'
// import InvoicesPage    from './pages/InvoicesPage'
// import RemindersPage   from './pages/RemindersPage'
// import AdminPage       from './pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Routen werden in Schritt 4 (Frontend) verdrahtet */}
      <Route path="*" element={<div style={{padding:40}}>🚧 Vertragsverwaltung – Setup läuft...</div>} />
    </Routes>
  )
}
