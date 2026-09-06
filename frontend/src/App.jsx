import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import FarmerDashboard from './pages/FarmerDashboard'
import B2BPortal from './pages/B2BPortal'
import B2CStorefront from './pages/B2CStorefront'
import AIPanel from './pages/AIPanel'
import OrdersPage from './pages/OrdersPage'
import AdminPanel from './pages/AdminPanel'
import RoleGuard from './components/RoleGuard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPanel />} />

        {/* Role-specific pages */}
        <Route path="/farmer" element={
          <RoleGuard allowedRoles={['farmer']}><FarmerDashboard /></RoleGuard>
        } />
        <Route path="/b2b" element={
          <RoleGuard allowedRoles={['b2b']}><B2BPortal /></RoleGuard>
        } />
        <Route path="/b2c" element={
          <RoleGuard allowedRoles={['b2c']}><B2CStorefront /></RoleGuard>
        } />

        {/* Shared pages — all logged-in roles can access */}
        <Route path="/ai" element={
          <RoleGuard><AIPanel /></RoleGuard>
        } />
        <Route path="/orders" element={
          <RoleGuard><OrdersPage /></RoleGuard>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
