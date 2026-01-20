import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageStorage'
import Footer from '../components/Footer'
import './CrudeOilStrategiesPage.css'
import './HomePage.css'

const CrudeOilStrategiesPage = () => {
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const tradingViewWidgetRef = useRef(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [positioningImageUrl, setPositioningImageUrl] = useState(null)
  const [sentimentImageUrl, setSentimentImageUrl] = useState(null)
  const [geopoliticalImageUrl, setGeopoliticalImageUrl] = useState(null)
  const [sectionImages, setSectionImages] = useState({
    section1: null,
    section2: null,
    section3: null,
    section4: null
  })
  
  const toggleMenu = () => {
    if (openMobileNavSection === null || openMobileNavSection === 'main') {
      setOpenMobileNavSection(openMobileNavSection === 'main' ? null : 'main')
    } else {
      // If a section is open, just close it but keep menu open
      setOpenMobileNavSection('main')
    }
  }

  // Handle hover navigation
  const handleNavSectionEnter = (section) => {
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setDropdownFading(false)
    setOpenNavSection(section)
  }

  const handleNavSectionLeave = () => {
    // Start closing after a delay to allow moving to widget
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = setTimeout(() => {
      setDropdownFading(true)
      setTimeout(() => {
        setOpenNavSection(null)
        setDropdownFading(false)
        closeTimeoutRef.current = null
      }, 300)
    }, 200)
  }

  const handleDropdownWidgetEnter = () => {
    // Cancel any pending close when entering widget
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setDropdownFading(false)
  }

  const handleDropdownWidgetLeave = () => {
    // Close when leaving widget
    setDropdownFading(true)
    setTimeout(() => {
      setOpenNavSection(null)
      setDropdownFading(false)
    }, 300)
  }

  const handleLinkClick = () => {
    // Close dropdown immediately when a link is clicked
    setDropdownFading(true)
    setTimeout(() => {
      setOpenNavSection(null)
      setDropdownFading(false)
    }, 100)
  }

  // Handle scroll - fade out dropdown when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (openNavSection) {
        setDropdownFading(true)
        setTimeout(() => {
          setOpenNavSection(null)
          setDropdownFading(false)
        }, 300) // Fade animation duration
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [openNavSection])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  // Load images from Firebase Storage
  useEffect(() => {
    const loadImages = async () => {
      // Load banner image
      const bannerUrl = await getImageUrl('Crude-Oil-Strategies/oilocean.jpeg')
      if (bannerUrl) setBannerImageUrl(bannerUrl)

      // Load section images
      const positioningUrl = await getImageUrl('Crude-Oil-Strategies/Stockexchange.jpeg')
      if (positioningUrl) setPositioningImageUrl(positioningUrl)

      const sentimentUrl = await getImageUrl('Crude-Oil-Strategies/stockexchnage5.jpeg')
      if (sentimentUrl) setSentimentImageUrl(sentimentUrl)

      const geopoliticalUrl = await getImageUrl('Crude-Oil-Strategies/stockexchnage6.jpeg')
      if (geopoliticalUrl) setGeopoliticalImageUrl(geopoliticalUrl)

      // Load section dropdown images
      const sectionUrls = await Promise.all([
        getImageUrl('Section/man1.jpeg'),
        getImageUrl('Section/oilplant.jpeg'),
        getImageUrl('Section/RiskManagement.png'),
        getImageUrl('Section/Macro&GeopoliticalInsights.png')
      ])
      setSectionImages({
        section1: sectionUrls[0],
        section2: sectionUrls[1],
        section3: sectionUrls[2],
        section4: sectionUrls[3]
      })
    }
    loadImages()
  }, [])

  // Load TradingView widget
  useEffect(() => {
    const container = tradingViewWidgetRef.current
    if (container && !container.querySelector('script')) {
      // Clear any existing content first
      container.innerHTML = '<div class="tradingview-widget-container__widget"></div>'
      
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.type = 'text/javascript'
      script.async = true
      script.innerHTML = JSON.stringify({
        "autosize": false,
        "width": "100%",
        "height": "750",
        "symbol": "TVC:USOIL",
        "interval": "5",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_widget"
      })
      container.appendChild(script)
    }
    
    // Cleanup function to prevent multiple loads
    return () => {
      if (container) {
        const scripts = container.querySelectorAll('script')
        scripts.forEach(s => s.remove())
      }
    }
  }, [])

  // Position dropdown widget to span from Section 1 to Section 4 (only on open, not on scroll)
  useEffect(() => {
    if (openNavSection && navItemsRef.current.section1 && navItemsRef.current.section4) {
      const updatePosition = () => {
        const section1 = navItemsRef.current.section1
        const section4 = navItemsRef.current.section4
        const dropdownWidget = document.querySelector('.nav-dropdown-widget')
        
        if (dropdownWidget && section1 && section4) {
          const rect1 = section1.getBoundingClientRect()
          const rect4 = section4.getBoundingClientRect()
          
          const left = rect1.left - 80
          const width = (rect4.right - rect1.left) + 160
          const top = rect4.bottom + 24
          
          dropdownWidget.style.left = `${left}px`
          dropdownWidget.style.top = `${top}px`
          dropdownWidget.style.width = `${width}px`
          dropdownWidget.style.transform = 'none'
        }
      }
      
      // Position immediately when opened
      updatePosition()
      
      // Only update on window resize, not on scroll
      const handleResize = () => {
        if (openNavSection) {
          updatePosition()
        }
      }
      
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [openNavSection])


  return (
    <div className="crude-oil-strategies-page">
      <header className="header">
        <nav className="nav">
          <div className="nav-container">
            <Link to="/" className="logo">
              <h1>Opessocius</h1>
            </Link>
            <div className="nav-links-wrapper" ref={dropdownRef}>
              <ul className="nav-links">
                <li className={`nav-item-new ${openNavSection === 'section1' ? 'open' : ''}`} ref={el => navItemsRef.current.section1 = el}>
                  <button 
                    className="nav-link-button-new"
                    onMouseEnter={() => handleNavSectionEnter('section1')}
                    onMouseLeave={handleNavSectionLeave}
                    onClick={() => handleNavSectionEnter('section1')}
                  >
                    Company
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="nav-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </li>
                <li className={`nav-item-new ${openNavSection === 'section2' ? 'open' : ''}`} ref={el => navItemsRef.current.section2 = el}>
                  <button 
                    className="nav-link-button-new"
                    onMouseEnter={() => handleNavSectionEnter('section2')}
                    onMouseLeave={handleNavSectionLeave}
                    onClick={() => handleNavSectionEnter('section2')}
                  >
                    Solutions
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="nav-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </li>
                <li className={`nav-item-new ${openNavSection === 'section3' ? 'open' : ''}`} ref={el => navItemsRef.current.section3 = el}>
                  <button 
                    className="nav-link-button-new"
                    onMouseEnter={() => handleNavSectionEnter('section3')}
                    onMouseLeave={handleNavSectionLeave}
                    onClick={() => handleNavSectionEnter('section3')}
                  >
                    Investments
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="nav-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </li>
                <li className={`nav-item-new ${openNavSection === 'section4' ? 'open' : ''}`} ref={el => navItemsRef.current.section4 = el}>
                  <button 
                    className="nav-link-button-new"
                    onMouseEnter={() => handleNavSectionEnter('section4')}
                    onMouseLeave={handleNavSectionLeave}
                    onClick={() => handleNavSectionEnter('section4')}
                  >
                    Resources
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="nav-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </li>
              </ul>
              {openNavSection && (
                <div 
                  className={`nav-dropdown-widget ${dropdownFading ? 'fading-out' : ''}`}
                  ref={dropdownWidgetRef}
                  onMouseEnter={handleDropdownWidgetEnter}
                  onMouseLeave={handleDropdownWidgetLeave}
                >
                  <div className="nav-dropdown-widget-content">
                    {openNavSection === 'section1' && (
                      <>
                        <div className="nav-dropdown-widget-left">
                          <ul className="nav-dropdown-widget-list">
                            <li>
                              <Link to="/careers" onClick={handleLinkClick}>Careers</Link>
                              <span className="nav-dropdown-widget-subtext">Build the future with Opessocius</span>
                            </li>
                            <li>
                              <Link to="/contact" onClick={handleLinkClick}>Contact</Link>
                              <span className="nav-dropdown-widget-subtext">How to reach us</span>
                            </li>
                            <li>
                              <Link to="/our-team" onClick={handleLinkClick}>Our Team</Link>
                              <span className="nav-dropdown-widget-subtext">Team and offices</span>
                            </li>
                            <li>
                              <Link to="/partners" onClick={handleLinkClick}>Partners</Link>
                              <span className="nav-dropdown-widget-subtext">Our ecosystem</span>
                            </li>
                          </ul>
                        </div>
                        <div className="nav-dropdown-widget-image">
                          {sectionImages.section1 && (
                            <img src={sectionImages.section1} alt="Company" />
                          )}
                        </div>
                      </>
                    )}
                    {openNavSection === 'section2' && (
                      <>
                        <div className="nav-dropdown-widget-left">
                          <ul className="nav-dropdown-widget-list">
                            <li>
                              <Link to="/crude-oil-strategies" onClick={handleLinkClick}>Crude Oil Strategies</Link>
                              <span className="nav-dropdown-widget-subtext">Energy-focused trading systems</span>
                            </li>
                            <li>
                              <Link to="/portfolio-models" onClick={handleLinkClick}>Portfolio Models</Link>
                              <span className="nav-dropdown-widget-subtext">Structured investment portfolios</span>
                            </li>
                            <li>
                              <Link to="/risk-management" onClick={handleLinkClick}>Risk Management</Link>
                              <span className="nav-dropdown-widget-subtext">Controlled downside exposure</span>
                            </li>
                            <li>
                              <Link to="/execution-technology" onClick={handleLinkClick}>Execution & Technology</Link>
                              <span className="nav-dropdown-widget-subtext">Data-driven execution</span>
                            </li>
                          </ul>
                        </div>
                        <div className="nav-dropdown-widget-image">
                          {sectionImages.section2 && (
                            <img src={sectionImages.section2} alt="Solutions" />
                          )}
                        </div>
                      </>
                    )}
                    {openNavSection === 'section3' && (
                      <>
                        <div className="nav-dropdown-widget-left">
                          <ul className="nav-dropdown-widget-list">
                            <li>
                              <Link to="/investment-calculator" onClick={handleLinkClick}>Investment Calculator</Link>
                              <span className="nav-dropdown-widget-subtext">Estimate potential outcomes</span>
                            </li>
                            <li>
                              <Link to="/managed-portfolios" onClick={handleLinkClick}>Managed Portfolios</Link>
                              <span className="nav-dropdown-widget-subtext">Professionally managed capital</span>
                            </li>
                            <li>
                              <Link to="/performance-tracking" onClick={handleLinkClick}>Performance Tracking</Link>
                              <span className="nav-dropdown-widget-subtext">Transparent reporting</span>
                            </li>
                            <li>
                              <Link to="/onboarding" onClick={handleLinkClick}>Onboarding</Link>
                              <span className="nav-dropdown-widget-subtext">Simple account setup</span>
                            </li>
                          </ul>
                        </div>
                        <div className="nav-dropdown-widget-image">
                          {sectionImages.section3 && (
                            <img src={sectionImages.section3} alt="Investments" />
                          )}
                        </div>
                      </>
                    )}
                    {openNavSection === 'section4' && (
                      <>
                        <div className="nav-dropdown-widget-left">
                          <ul className="nav-dropdown-widget-list">
                            <li>
                              <Link to="/learning" onClick={handleLinkClick}>Learning</Link>
                              <span className="nav-dropdown-widget-subtext">Education and indicators</span>
                            </li>
                            <li>
                              <Link to="/macro-insights" onClick={handleLinkClick}>Macro Insights</Link>
                              <span className="nav-dropdown-widget-subtext">Global market drivers</span>
                            </li>
                            <li>
                              <Link to="/risk-guidance" onClick={handleLinkClick}>Risk Guidance</Link>
                              <span className="nav-dropdown-widget-subtext">Probabilities and expectations</span>
                            </li>
                            <li>
                              <Link to="/compliance" onClick={handleLinkClick}>Compliance</Link>
                              <span className="nav-dropdown-widget-subtext">Legal and disclosures</span>
                            </li>
                          </ul>
                        </div>
                        <div className="nav-dropdown-widget-image">
                          {sectionImages.section4 && (
                            <img src={sectionImages.section4} alt="Resources" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="header-actions">
              <Link to="/contact" className="contact-link">Contact Us</Link>
              <Link to="/login" className="btn-login">Login</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="main-content">
        <section className="page-banner">
          <div 
            className="page-banner-image"
            style={{
              backgroundImage: bannerImageUrl ? `url(${bannerImageUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
          </div>
          <div className="page-banner-overlay">
            <div className="page-banner-content">
              <h1 className="page-banner-title">Crude Oil Strategies</h1>
              <p className="page-banner-subtitle">Energy-focused trading systems</p>
            </div>
          </div>
        </section>

        {/* TradingView Chart Section */}
        <section className="white-section chart-section">
          <div className="container">
            <div className="tradingview-widget-container" ref={tradingViewWidgetRef}>
              <div className="tradingview-widget-container__widget"></div>
            </div>
          </div>
        </section>

        {/* Text Section */}
        <section className="white-section strategy-text-section">
          <div className="container">
            <div className="strategy-text-content">
              <p className="strategy-text-small">
                Our systematic approach to crude oil trading leverages quantitative models and real-time market analysis to identify and capitalize on structural inefficiencies in energy markets.
              </p>
            </div>
          </div>
        </section>

        {/* Positioning & Exposure Control Section */}
        <section className="white-section positioning-section">
          <div className="container">
            <div className="positioning-content">
              <div className="positioning-text">
                <h2 className="positioning-title">Positioning & Exposure Control</h2>
                <div className="positioning-body">
                  <p>Our crude oil strategy is based on disciplined position sizing and controlled leverage usage. While leverage is applied to enhance market participation, we consistently maintain an operational buffer equivalent to six unused positions, preserving sufficient margin at all times. This structure allows the portfolio to absorb adverse price movements, avoid forced liquidations, and retain execution flexibility. Entries, scaling, and exits are managed within predefined risk thresholds, ensuring that leverage increases potential without compromising capital stability or overall market safety.</p>
                </div>
              </div>
              <div className="positioning-image">
                <div 
                  className="positioning-image-widget"
                  style={{
                    backgroundImage: positioningImageUrl ? `url(${positioningImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Market Sentiment & Technical Analysis Section */}
        <section className="white-section sentiment-section">
          <div className="container">
            <div className="sentiment-content">
              <div className="sentiment-image">
                <div 
                  className="sentiment-image-widget"
                  style={{
                    backgroundImage: sentimentImageUrl ? `url(${sentimentImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
              </div>
              <div className="sentiment-text">
                <h2 className="sentiment-title">Market Sentiment & Technical Analysis</h2>
                <div className="sentiment-body">
                  <p>Our strategy integrates market sentiment analysis with technical indicators to assess price behavior directly from the chart. Tools such as RSI, momentum oscillators, volatility measures, and trend structure are evaluated alongside greed and fear dynamics to identify overstretched conditions and confirm trade quality. This combined framework helps filter emotional market noise, reduce false signals, and ensure entries, scaling, and exits are driven by data rather than speculation.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Geopolitical Events & Macro Awareness Section */}
        <section className="white-section geopolitical-section">
          <div className="container">
            <div className="geopolitical-content">
              <div className="geopolitical-text">
                <h2 className="geopolitical-title">Geopolitical Events & Macro Awareness</h2>
                <div className="geopolitical-body">
                  <p>Crude oil markets are highly sensitive to geopolitical developments and macroeconomic events. We actively monitor key drivers such as OPEC decisions, FOMC announcements, supply disruptions, and global conflicts that may impact volatility and liquidity. Dedicated systems and internal coordination ensure timely information flow across the team, allowing risk exposure to be adjusted proactively when market conditions shift due to external events.</p>
                </div>
              </div>
              <div className="geopolitical-image">
                <div 
                  className="geopolitical-image-widget"
                  style={{
                    backgroundImage: geopoliticalImageUrl ? `url(${geopoliticalImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="white-section cta-section">
          <div className="container">
            <div className="cta-content">
              <h2 className="cta-title">Structured Portfolio Solutions for Capital Growth</h2>
              <p className="cta-subtitle">
                Investors may select between conservative and higher-risk profiles, each operating within a jointly managed capital structure that enhances margin safety and execution resilience.
              </p>
              <Link to="/investment-calculator" className="btn btn-primary-white">
                Calculate your investment →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer handleLinkClick={handleLinkClick} />
    </div>
  )
}

export default CrudeOilStrategiesPage
