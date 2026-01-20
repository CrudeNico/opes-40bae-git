import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import '../pages/HomePage.css'

const Footer = ({ handleLinkClick }) => {
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <h2 className="footer-logo">Opessocius</h2>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <button 
                className="footer-column-title mobile-toggle"
                onClick={() => setExpandedFooterSection(expandedFooterSection === 'pages' ? null : 'pages')}
                aria-expanded={expandedFooterSection === 'pages'}
              >
                Pages
                <span className="footer-chevron">›</span>
              </button>
              <div style={{ display: 'flex', gap: '4.5rem' }}>
                <ul className={`footer-link-list ${expandedFooterSection === 'pages' ? 'expanded' : ''}`} style={{ flex: 1 }}>
                  <li><Link to="/careers" onClick={handleLinkClick}>Careers</Link></li>
                  <li><Link to="/contact" onClick={handleLinkClick}>Contact</Link></li>
                  <li><Link to="/our-team" onClick={handleLinkClick}>Our Team</Link></li>
                  <li><Link to="/partners" onClick={handleLinkClick}>Partners</Link></li>
                </ul>
                <ul className={`footer-link-list ${expandedFooterSection === 'pages' ? 'expanded' : ''}`} style={{ flex: 1 }}>
                  <li><Link to="/crude-oil-strategies" onClick={handleLinkClick}>Crude Oil Strategies</Link></li>
                  <li><Link to="/portfolio-models" onClick={handleLinkClick}>Portfolio Models</Link></li>
                  <li><Link to="/risk-management" onClick={handleLinkClick}>Risk Management</Link></li>
                  <li><Link to="/execution-technology" onClick={handleLinkClick}>Execution and Technology</Link></li>
                </ul>
                <ul className={`footer-link-list ${expandedFooterSection === 'pages' ? 'expanded' : ''}`} style={{ flex: 1 }}>
                  <li><Link to="/investment-calculator" onClick={handleLinkClick}>Investment Calculator</Link></li>
                  <li><Link to="/managed-portfolios" onClick={handleLinkClick}>Managed Portfolios</Link></li>
                  <li><Link to="/performance-tracking" onClick={handleLinkClick}>Performance Tracking</Link></li>
                  <li><Link to="/onboarding" onClick={handleLinkClick}>Onboarding</Link></li>
                </ul>
                <ul className={`footer-link-list ${expandedFooterSection === 'pages' ? 'expanded' : ''}`} style={{ flex: 1 }}>
                  <li><Link to="/learning" onClick={handleLinkClick}>Learning</Link></li>
                  <li><Link to="/macro-insights" onClick={handleLinkClick}>Macro Insights</Link></li>
                  <li><Link to="/risk-guidance" onClick={handleLinkClick}>Risk Guidance</Link></li>
                  <li><Link to="/compliance" onClick={handleLinkClick}>Compliance</Link></li>
                </ul>
              </div>
            </div>
            <div className="footer-column">
              <button 
                className="footer-column-title mobile-toggle"
                onClick={() => setExpandedFooterSection(expandedFooterSection === 'legal' ? null : 'legal')}
                aria-expanded={expandedFooterSection === 'legal'}
              >
                Legal
                <span className="footer-chevron">›</span>
              </button>
              <ul className={`footer-link-list ${expandedFooterSection === 'legal' ? 'expanded' : ''}`}>
                <li><span>Registered in Dubai, United Arab Emirates</span></li>
                <li><span>Regulated under applicable UAE laws and regulations</span></li>
              </ul>
            </div>
            <div className="footer-column">
              <button 
                className="footer-column-title mobile-toggle"
                onClick={() => setExpandedFooterSection(expandedFooterSection === 'company' ? null : 'company')}
                aria-expanded={expandedFooterSection === 'company'}
              >
                Company
                <span className="footer-chevron">›</span>
              </button>
              <ul className={`footer-link-list ${expandedFooterSection === 'company' ? 'expanded' : ''}`}>
                <li><Link to="/our-team" onClick={handleLinkClick}>About Us</Link></li>
                <li><Link to="/careers" onClick={handleLinkClick}>Careers</Link></li>
                <li><Link to="/contact" onClick={handleLinkClick}>Contact</Link></li>
                <li><Link to="/partners" onClick={handleLinkClick}>Partners</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-links">
            <Link to="/policy" onClick={handleLinkClick}>Privacy</Link>
            <Link to="/policy" onClick={handleLinkClick}>Cookie Policy</Link>
            <Link to="/policy" onClick={handleLinkClick}>Terms of Use</Link>
          </div>
          <div className="footer-copyright">© 2026 Opessocius</div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
