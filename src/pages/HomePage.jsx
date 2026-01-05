import React, { useState } from 'react'
import './HomePage.css'

const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const partners = [
    { id: 1, name: 'Partner 1', size: 'smaller' },
    { id: 4, name: 'Partner 4', size: 'bigger' },
    { id: 5, name: 'Partner 5', size: 'smaller' },
    { id: 6, name: 'Partner 6', size: 'bigger' },
    { id: 7, name: 'Partner 7', size: 'smaller' },
    { id: 8, name: 'Partner 8', size: 'large' }
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <div className="home-page">
      <header className="header">
        <nav className="nav">
          <div className="nav-container">
            <div className="logo">
              <h1>Opessocius</h1>
            </div>
            <ul className="nav-links">
              <li><a href="#products">Products</a></li>
              <li><a href="#solutions">Solutions</a></li>
              <li><a href="#markets">Markets</a></li>
              <li><a href="#resources">Resources</a></li>
              <li><a href="#company">Company</a></li>
            </ul>
            <div className="header-actions">
              <a href="#contact" className="contact-link">Contact Us</a>
              <button className="btn-login">Login</button>
            </div>
            <button 
              className="menu-toggle" 
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span className={isMenuOpen ? 'open' : ''}></span>
              <span className={isMenuOpen ? 'open' : ''}></span>
            </button>
          </div>
          <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <ul className="mobile-nav-links">
              <li><a href="#products" onClick={toggleMenu}>Products</a></li>
              <li><a href="#solutions" onClick={toggleMenu}>Solutions</a></li>
              <li><a href="#markets" onClick={toggleMenu}>Markets</a></li>
              <li><a href="#resources" onClick={toggleMenu}>Resources</a></li>
              <li><a href="#company" onClick={toggleMenu}>Company</a></li>
              <li><a href="#contact" onClick={toggleMenu}>Contact Us</a></li>
              <li><button className="btn-login-mobile" onClick={toggleMenu}>Login</button></li>
            </ul>
          </div>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Monetize, Track and Trade Energy & Environmental Commodities</h1>
            <p className="hero-subtitle">
              Opessocius operates the world's largest integrated platform for the energy transition – trusted by financial institutions, corporations, governments and power producers worldwide.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary">Talk to an Expert →</button>
              <button className="btn btn-secondary">Explore Platform</button>
            </div>
          </div>
          
          <div className="partners-section">
            <div className="partners-container">
              <div className="partners-track">
                {[...partners, ...partners].map((partner, index) => (
                  <div key={index} className="partner-item">
                    <img 
                      src={`/images/partners/partner${partner.id}.png`} 
                      alt={partner.name}
                      className={`partner-logo partner-logo-${partner.size}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="white-section">
          <div className="container">
            {/* Hero Section */}
            <div className="white-hero">
              <h2 className="white-hero-title">The Global Platform for Energy and Environmental Commodities</h2>
              <p className="white-hero-subtitle">
                From trading and brokerage to registries, wholesale power and beyond – Xpansiv gives you the proven platform to capture opportunities and drive environmental impact.
              </p>
              <button className="btn btn-primary-white">Explore Platform →</button>
            </div>

            {/* Video Widget */}
            <div className="video-widget">
              <div className="video-container">
                {/* Video will be added here */}
              </div>
            </div>

            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-icon">◉</div>
                <h3 className="stat-title">Global Transaction Expertise</h3>
                <p className="stat-description">Transact in renewable energy, carbon and more across 5 continents</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">▦</div>
                <h3 className="stat-title">300 GW</h3>
                <p className="stat-description">Capacity of Xpansiv's unmatched global REC registry network</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">▣</div>
                <h3 className="stat-title">&gt;20%</h3>
                <p className="stat-description">ERCOT and CAISO battery storage capacity served by Xpansiv (formerly APX)</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✓</div>
                <h3 className="stat-title">Trusted by the Market</h3>
                <p className="stat-description">Over 100,000 customers - from Fortune 500 companies and government agencies to project developers and homeowners</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
