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
      </main>
    </div>
  )
}

export default HomePage
