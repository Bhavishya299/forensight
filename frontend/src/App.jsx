import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import CaseWorkspaceLayout from './components/case/CaseWorkspaceLayout.jsx'
import Login from './pages/Login.jsx'
import RequestAccess from './pages/RequestAccess.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Cases from './pages/Cases.jsx'
import CreateCase from './pages/CreateCase.jsx'
import CaseDetails from './pages/CaseDetails.jsx'
import CaseGraph from './pages/CaseGraph.jsx'
import CrimeTimeline from './pages/CrimeTimeline.jsx'
import Alerts from './pages/Alerts.jsx'
import Contradictions from './pages/Contradictions.jsx'
import Evidence from './pages/Evidence.jsx'
import Reports from './pages/Reports.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import VehicleIntelligence from './pages/VehicleIntelligence.jsx'
import EntityProfile from './pages/EntityProfile.jsx'
import CrossCase from './pages/CrossCase.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
  return (
    <Routes>
      {/* Public / login */}
      <Route path="/login" element={<Login />} />
      <Route path="/request-access" element={<RequestAccess />} />

      {/* Authenticated application shell */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/new" element={<CreateCase />} />

        {/* Case workspace with section tabs */}
        <Route path="/cases/:id" element={<CaseWorkspaceLayout />}>
          <Route index element={<CaseDetails />} />
          <Route path="graph" element={<CaseGraph />} />
          <Route path="timeline" element={<CrimeTimeline />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="contradictions" element={<Contradictions />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/vehicle-intelligence" element={<VehicleIntelligence />} />
        <Route path="/entities/:entityId" element={<EntityProfile />} />
        <Route path="/entities/:entityId/cross-case" element={<CrossCase />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
