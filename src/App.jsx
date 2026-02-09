import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import FirstAdminSetupPage from './pages/FirstAdminSetupPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CareersPage from './pages/CareersPage'
import ContactPage from './pages/ContactPage'
import OurTeamPage from './pages/OurTeamPage'
import PartnersPage from './pages/PartnersPage'
import CrudeOilStrategiesPage from './pages/CrudeOilStrategiesPage'
import PortfolioModelsPage from './pages/PortfolioModelsPage'
import RiskManagementPage from './pages/RiskManagementPage'
import ExecutionTechnologyPage from './pages/ExecutionTechnologyPage'
import InvestmentCalculatorPage from './pages/InvestmentCalculatorPage'
import ManagedPortfoliosPage from './pages/ManagedPortfoliosPage'
import PerformanceTrackingPage from './pages/PerformanceTrackingPage'
import OnboardingPage from './pages/OnboardingPage'
import LearningPage from './pages/LearningPage'
import MacroInsightsPage from './pages/MacroInsightsPage'
import RiskGuidancePage from './pages/RiskGuidancePage'
import CompliancePage from './pages/CompliancePage'
import PolicyPage from './pages/PolicyPage'
import './App.css'

// Component to handle scroll-to-top on route changes
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Multiple methods to ensure scroll works
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    // Also try after a delay in case content is still loading
    const timeout = setTimeout(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, 100)
    
    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/first-admin-setup" element={<FirstAdminSetupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/our-team" element={<OurTeamPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/crude-oil-strategies" element={<CrudeOilStrategiesPage />} />
          <Route path="/portfolio-models" element={<PortfolioModelsPage />} />
          <Route path="/risk-management" element={<RiskManagementPage />} />
          <Route path="/execution-technology" element={<ExecutionTechnologyPage />} />
          <Route path="/investment-calculator" element={<InvestmentCalculatorPage />} />
          <Route path="/managed-portfolios" element={<ManagedPortfoliosPage />} />
          <Route path="/performance-tracking" element={<PerformanceTrackingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/macro-insights" element={<MacroInsightsPage />} />
          <Route path="/risk-guidance" element={<RiskGuidancePage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/policy" element={<PolicyPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

