import React, { useState } from 'react'
import './HomePage.css'

const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)

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

            {/* Second Hero Section */}
            <div className="white-hero second-hero">
              <h2 className="white-hero-title">The Global Platform for Energy and Environmental Commodities</h2>
              <p className="white-hero-subtitle">
                From trading and brokerage to registries, wholesale power and beyond – Xpansiv gives you the proven platform to capture opportunities and drive environmental impact.
              </p>
              <button className="btn btn-primary-white">Explore Platform →</button>
            </div>

            {/* Tabbed Widget Section */}
            <div className="tabbed-widget-section">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
                  onClick={() => setActiveTab(0)}
                >
                  Commodity Buyers
                </button>
                <button 
                  className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
                  onClick={() => setActiveTab(1)}
                >
                  Traders & Brokers
                </button>
                <button 
                  className={`tab-button ${activeTab === 2 ? 'active' : ''}`}
                  onClick={() => setActiveTab(2)}
                >
                  Asset Owners
                </button>
                <button 
                  className={`tab-button ${activeTab === 3 ? 'active' : ''}`}
                  onClick={() => setActiveTab(3)}
                >
                  Power Producers
                </button>
                <button 
                  className={`tab-button ${activeTab === 4 ? 'active' : ''}`}
                  onClick={() => setActiveTab(4)}
                >
                  Solar Installers
                </button>
                <button 
                  className={`tab-button ${activeTab === 5 ? 'active' : ''}`}
                  onClick={() => setActiveTab(5)}
                >
                  Homeowners
                </button>
                <button 
                  className={`tab-button ${activeTab === 6 ? 'active' : ''}`}
                  onClick={() => setActiveTab(6)}
                >
                  EV & Fleet
                </button>
              </div>

              <div className="tabbed-widget-container">
                <div className="tabbed-widget-background">
                  <div className="blue-fade-left"></div>
                  <div className="blue-fade-right"></div>
                </div>
                <div className="tabbed-widget">
                  <div className="tabbed-widget-content">
                    {activeTab === 0 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">ENVIRONMENTAL COMMODITY BUYERS</p>
                        <h3 className="widget-title">Buy with precision, report with confidence.</h3>
                        <p className="widget-description">
                          Xpansiv connects sustainability leaders at corporations, utilities and beyond to clean power, renewable energy certificates, verified carbon credits and clean fuel credits – streamlining procurement, reporting and impact tracking across global markets.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 1 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">TRADERS & BROKERS</p>
                        <h3 className="widget-title">Trade with confidence and efficiency.</h3>
                        <p className="widget-description">
                          Access comprehensive trading platforms and market data to execute trades across renewable energy, carbon, and environmental commodities with precision and speed.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 2 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">ASSET OWNERS</p>
                        <h3 className="widget-title">Maximize the value of your assets.</h3>
                        <p className="widget-description">
                          Leverage Xpansiv's platform to optimize your renewable energy assets, track performance, and monetize environmental attributes effectively.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 3 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">POWER PRODUCERS</p>
                        <h3 className="widget-title">Streamline production and distribution.</h3>
                        <p className="widget-description">
                          Connect your power generation assets to global markets, track renewable energy certificates, and manage your environmental commodity portfolio seamlessly.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 4 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">SOLAR INSTALLERS</p>
                        <h3 className="widget-title">Expand your business opportunities.</h3>
                        <p className="widget-description">
                          Integrate solar installations with Xpansiv's platform to help your customers track and monetize their renewable energy generation.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 5 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">HOMEOWNERS</p>
                        <h3 className="widget-title">Track your clean energy impact.</h3>
                        <p className="widget-description">
                          Monitor your solar generation, track renewable energy certificates, and see the environmental impact of your clean energy investment.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                    {activeTab === 6 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">EV & FLEET</p>
                        <h3 className="widget-title">Electrify with confidence.</h3>
                        <p className="widget-description">
                          Manage your electric vehicle fleet, track clean fuel credits, and optimize your transition to sustainable transportation.
                        </p>
                        <div className="widget-buttons">
                          <button className="btn btn-primary-white">Learn More →</button>
                          <button className="btn btn-secondary-white">Trading Platforms</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Third Hero Section */}
            <div className="white-hero third-hero">
              <h2 className="white-hero-title">The Global Platform for Energy and Environmental Commodities</h2>
              <p className="white-hero-subtitle">
                From trading and brokerage to registries, wholesale power and beyond – Xpansiv gives you the proven platform to capture opportunities and drive environmental impact.
              </p>
              <button className="btn btn-primary-white">Explore Platform →</button>
            </div>

            {/* Third Widget - Calendar */}
            <div className="third-widget-section">
              <div className="third-widget">
                {!selectedDate ? (
                  <div className="calendar-container">
                    <div className="calendar-layout">
                      <div className="advisor-section">
                        <div className="advisor-profile">
                          <div className="advisor-avatar">
                            <div className="live-indicator"></div>
                          </div>
                          <h4 className="advisor-name">John Smith</h4>
                          <p className="response-time-mobile">receive a response within 24 hours</p>
                        </div>
                        <div className="consultation-steps">
                          <h5 className="steps-title">How it works:</h5>
                          <div className="step-item">
                            <span className="step-number">1</span>
                            <p className="step-text">Select your preferred date and time</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">2</span>
                            <p className="step-text">Fill in your contact information</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">3</span>
                            <p className="step-text">Receive confirmation and meeting details</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">4</span>
                            <p className="step-text">Prepare your questions and topics</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">5</span>
                            <p className="step-text">Join the consultation at scheduled time</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">6</span>
                            <p className="step-text">Follow up with any additional needs</p>
                          </div>
                        </div>
                      </div>
                      <div className="calendar-section">
                        <p className="mobile-description">Schedule a appointment with a specialise investment advisor from our team and get strated now!</p>
                        <h3 className="calendar-title">Select a Consultation Date</h3>
                        <div className="calendar-widget">
                          <div className="calendar-header">
                            <button className="calendar-nav" onClick={() => {}}>‹</button>
                            <h4 className="calendar-month">January 2024</h4>
                            <button className="calendar-nav" onClick={() => {}}>›</button>
                          </div>
                          <div className="calendar-grid">
                            <div className="calendar-weekdays">
                              <div className="calendar-weekday">Sun</div>
                              <div className="calendar-weekday">Mon</div>
                              <div className="calendar-weekday">Tue</div>
                              <div className="calendar-weekday">Wed</div>
                              <div className="calendar-weekday">Thu</div>
                              <div className="calendar-weekday">Fri</div>
                              <div className="calendar-weekday">Sat</div>
                            </div>
                            <div className="calendar-days">
                              {[...Array(35)].map((_, index) => {
                                const day = index - 0 + 1
                                const isAvailable = day > 0 && day <= 31 && day % 3 !== 0
                                return (
                                  <button
                                    key={index}
                                    className={`calendar-day ${isAvailable ? 'available' : 'unavailable'}`}
                                    onClick={() => isAvailable && setSelectedDate(new Date(2024, 0, day))}
                                    disabled={!isAvailable}
                                  >
                                    {day > 0 && day <= 31 ? day : ''}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="consultation-form">
                    <div className="form-header">
                      <button className="back-button" onClick={() => setSelectedDate(null)}>← Back</button>
                      <h3 className="form-title">Schedule Your Consultation</h3>
                      <p className="selected-date">Selected: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    
                    <div className="form-content-layout">
                      <div className="form-left">
                        <div className="time-selection">
                          <label className="form-label">Select Time</label>
                          <div className="time-slots">
                            {['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map((time) => (
                              <button
                                key={time}
                                className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                                onClick={() => setSelectedTime(time)}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-fields">
                          <div className="form-field">
                            <label className="form-label">Full Name</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Enter your name"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                          </div>

                          <div className="form-field">
                            <label className="form-label">Company (Optional)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Enter your company name"
                              value={formData.company}
                              onChange={(e) => setFormData({...formData, company: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-right">
                        <div className="form-field form-field-full">
                          <label className="form-label">Meeting Details (Optional)</label>
                          <textarea
                            className="form-textarea"
                            placeholder="Tell us about what you'd like to discuss..."
                            rows="4"
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                          />
                        </div>

                        <div className="form-field">
                          <label className="form-label">Email</label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>

                        <button className="btn btn-primary-white submit-button" onClick={() => alert('Consultation scheduled!')}>
                          Schedule Consultation
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Light Blue Section */}
        <section className="light-blue-section">
          <div className="container">
            <div className="light-blue-content">
              <div className="light-blue-image">
                <div className="image-placeholder">
                  {/* Image will be added here */}
                </div>
              </div>
              <div className="light-blue-text">
                <h2 className="light-blue-title">Transact efficiently across commodities</h2>
                <p className="light-blue-subtitle">One platform for the full range of energy and environmental commodities.</p>
                <a href="#" className="light-blue-learn-more">Learn more <span className="learn-more-arrow">›</span></a>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Learning & Insights Section */}
        <section className="white-section">
          <div className="container">
            <div className="featured-section-header">
              <h2 className="featured-section-title">Featured Learning & Insights</h2>
              <button className="btn-view-all">View All <span className="view-all-arrow">→</span></button>
            </div>
            <div className="featured-cards-grid">
              <div className="featured-card">
                <div className="featured-card-image">
                  {/* Image will be added here */}
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">CBL, FEATURED NEWS, MARKET</div>
                  <h3 className="featured-card-title">Xpansiv Launches Consolidated Renewable Energy...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div className="featured-card-image">
                  {/* Image will be added here */}
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">EMA, FEATURED NEWS, PRODUCT</div>
                  <h3 className="featured-card-title">New York State Selects Xpansiv to Power Its Greenhous...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div className="featured-card-image">
                  {/* Image will be added here */}
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">ACE, CBL, FEATURED NEWS, MARKET</div>
                  <h3 className="featured-card-title">Xpansiv and KRX to Collaborate on Korean Carbon Cred...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div className="featured-card-image">
                  {/* Image will be added here */}
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">FEATURED NEWS</div>
                  <h3 className="featured-card-title">Xpansiv Recognized as One of the Best Companies to Work...</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="white-section">
          <div className="container">
            <div className="cta-widget">
              <div className="cta-widget-background">
                {/* Background image will be added here */}
              </div>
              <div className="cta-widget-content">
                <h2 className="cta-title">Ready to transact with confidence?</h2>
                <button className="btn btn-primary-white cta-button">Talk to an Expert →</button>
              </div>
            </div>
            <p className="disclaimer-text">
              Trading in futures and options involves substantial risk of loss and is not suitable for everyone. Past performance is not indicative of future results.
              <br /><br />
              When Evolution Markets acts as a broker in futures contracts, either on an introductory or execution basis, it is acting through its wholly-owned subsidiaries, Evolution Markets Futures LLC or Evolution Markets Limited. Evolution Markets Futures LLC is an introducing broker registered with the U.S. Commodity Futures Trading Commission and is a member of the National Futures Association. Evolution Markets Limited is registered with the U.K. Financial Conduct Authority and is an introducing broker registered with the U.S. Commodity Futures Trading Commission and is a member of the National Futures Association.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h2 className="footer-logo">Opessocius</h2>
              <div className="footer-social">
                <a href="#" className="social-icon" aria-label="LinkedIn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="currentColor"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" aria-label="YouTube">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <button 
                  className="footer-column-title mobile-toggle"
                  onClick={() => setExpandedFooterSection(expandedFooterSection === 'products' ? null : 'products')}
                  aria-expanded={expandedFooterSection === 'products'}
                >
                  Products
                  <span className="footer-chevron">›</span>
                </button>
                <ul className={`footer-link-list ${expandedFooterSection === 'products' ? 'expanded' : ''}`}>
                  <li><a href="#">Trading Platforms</a></li>
                  <li><a href="#">Market Execution</a></li>
                  <li><a href="#">Registries</a></li>
                  <li><a href="#">Power</a></li>
                  <li><a href="#">Connect</a></li>
                  <li><a href="#">Data</a></li>
                  <li><a href="#">Managed Solutions - Solar</a></li>
                  <li><a href="#">Managed Solutions - Clean Transportation</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <button 
                  className="footer-column-title mobile-toggle"
                  onClick={() => setExpandedFooterSection(expandedFooterSection === 'solutions' ? null : 'solutions')}
                  aria-expanded={expandedFooterSection === 'solutions'}
                >
                  Solutions
                  <span className="footer-chevron">›</span>
                </button>
                <ul className={`footer-link-list ${expandedFooterSection === 'solutions' ? 'expanded' : ''}`}>
                  <li><a href="#">Solutions</a></li>
                  <li><a href="#">Environmental Commodity Buyers</a></li>
                  <li><a href="#">Traders & Brokers</a></li>
                  <li><a href="#">Asset & Project Owners</a></li>
                  <li><a href="#">Power Producers</a></li>
                  <li><a href="#">Solar Installers</a></li>
                  <li><a href="#">Solar Homeowners & Businesses</a></li>
                  <li><a href="#">EV Charging & Fleet Operators</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <button 
                  className="footer-column-title mobile-toggle"
                  onClick={() => setExpandedFooterSection(expandedFooterSection === 'resources' ? null : 'resources')}
                  aria-expanded={expandedFooterSection === 'resources'}
                >
                  Resources
                  <span className="footer-chevron">›</span>
                </button>
                <ul className={`footer-link-list ${expandedFooterSection === 'resources' ? 'expanded' : ''}`}>
                  <li><a href="#">Learning & Insights</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Documents & Guides</a></li>
                  <li><a href="#">Support Center</a></li>
                  <li><a href="#">Developer Portal</a></li>
                </ul>
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
                  <li><a href="#">Trademark Usage</a></li>
                  <li><a href="#">Disclaimer (Evolution Markets)</a></li>
                  <li><a href="#">Compliance (Evolution Markets)</a></li>
                  <li><a href="#">Evolution Markets Futures LLC</a></li>
                  <li><a href="#">Modern Slavery Statement</a></li>
                  <li><a href="#">Supplier Code of Conduct</a></li>
                  <li><a href="#">CBL Markets (Australia) Pty Ltd AFSL 536825</a></li>
                  <li><a href="#">California Assembly Bill No. 1305</a></li>
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
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
                  <li><a href="#">News</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-bottom-links">
              <a href="#">Privacy</a>
              <a href="#">Cookie Policy</a>
              <a href="#">Terms of Use</a>
            </div>
            <div className="footer-copyright">© 2026 Opessocius</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
