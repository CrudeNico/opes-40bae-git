import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getImageUrl } from '../utils/imageStorage'
import Footer from '../components/Footer'
import './PerformanceTrackingPage.css'
import './HomePage.css'

const PerformanceTrackingPage = () => {
  const navigate = useNavigate()
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [widgetImages, setWidgetImages] = useState({})
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

  // Load banner image
  useEffect(() => {
    const loadBannerImage = async () => {
      const url = await getImageUrl('Performance-Tracking/stockexchnage2.jpeg')
      if (url) setBannerImageUrl(url)
    }
    loadBannerImage()
  }, [])

  // Load widget images
  useEffect(() => {
    const loadWidgetImages = async () => {
      const images = await Promise.all([
        getImageUrl('Performance-Tracking/screen.png'),
        getImageUrl('Performance-Tracking/trades.png'),
        getImageUrl('Performance-Tracking/oper.png'),
        getImageUrl('Performance-Tracking/proof.png'),
      ])
      setWidgetImages({
        widget1: images[0],
        widget2: images[1],
        widget3: images[2],
        widget4: images[3],
      })

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
    loadWidgetImages()
  }, [])

  // Performance widgets data
  const performanceWidgets = [
    { 
      id: 1, 
      title: 'Investor Performance Dashboard', 
      description: 'Each investor receives a dedicated panel with real-time and historical performance data. Monthly returns, equity curves, drawdowns, and account balances are displayed clearly, with no aggregated or obscured figures.', 
      imageKey: 'widget1' 
    },
    { 
      id: 2, 
      title: 'Monthly Performance Reports', 
      description: 'Detailed monthly reports are issued covering returns, open and closed positions, risk exposure, and capital movements. Reports are standardized, time-stamped, and aligned with the actual trading accounts.', 
      imageKey: 'widget2' 
    },
    { 
      id: 3, 
      title: 'Trade & Operations Transparency', 
      description: 'All trading activity is documented and reported. Position sizing, execution periods, and portfolio adjustments are disclosed so investors can verify how results were generated, not just the outcome.', 
      imageKey: 'widget3' 
    },
    { 
      id: 4, 
      title: 'Audit-Ready Record Keeping', 
      description: 'All performance data and reports are archived and accessible for review. This structure allows investors to independently track consistency over time and supports external verification if required.', 
      imageKey: 'widget4' 
    },
  ]

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
    <div className="performance-tracking-page">
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
            <button 
              className="menu-toggle" 
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span className={openMobileNavSection !== null ? 'open' : ''}></span>
              <span className={openMobileNavSection !== null ? 'open' : ''}></span>
            </button>
          </div>
          <div className={`mobile-menu ${openMobileNavSection !== null ? 'open' : ''}`}>
            <ul className="mobile-nav-links">
              <li className="mobile-nav-item">
                <button 
                  className="mobile-nav-button"
                  onClick={() => setOpenMobileNavSection(openMobileNavSection === 'section1' ? 'main' : 'section1')}
                  aria-expanded={openMobileNavSection === 'section1'}
                >
                  Company
                  <span className="mobile-chevron">›</span>
                </button>
                {openMobileNavSection === 'section1' && (
                  <ul className="mobile-submenu">
                    <li><Link to="/careers" onClick={toggleMenu}>Careers</Link></li>
                    <li><Link to="/contact" onClick={toggleMenu}>Contact</Link></li>
                    <li><Link to="/our-team" onClick={toggleMenu}>Our Team</Link></li>
                    <li><Link to="/partners" onClick={toggleMenu}>Partners</Link></li>
                  </ul>
                )}
              </li>
              <li className="mobile-nav-item">
                <button 
                  className="mobile-nav-button"
                  onClick={() => setOpenMobileNavSection(openMobileNavSection === 'section2' ? 'main' : 'section2')}
                  aria-expanded={openMobileNavSection === 'section2'}
                >
                  Solutions
                  <span className="mobile-chevron">›</span>
                </button>
                {openMobileNavSection === 'section2' && (
                  <ul className="mobile-submenu">
                    <li><Link to="/crude-oil-strategies" onClick={toggleMenu}>Crude Oil Strategies</Link></li>
                    <li><Link to="/portfolio-models" onClick={toggleMenu}>Portfolio Models</Link></li>
                    <li><Link to="/risk-management" onClick={toggleMenu}>Risk Management</Link></li>
                    <li><Link to="/execution-technology" onClick={toggleMenu}>Execution & Technology</Link></li>
                  </ul>
                )}
              </li>
              <li className="mobile-nav-item">
                <button 
                  className="mobile-nav-button"
                  onClick={() => setOpenMobileNavSection(openMobileNavSection === 'section3' ? 'main' : 'section3')}
                  aria-expanded={openMobileNavSection === 'section3'}
                >
                  Investments
                  <span className="mobile-chevron">›</span>
                </button>
                {openMobileNavSection === 'section3' && (
                  <ul className="mobile-submenu">
                    <li><Link to="/investment-calculator" onClick={toggleMenu}>Investment Calculator</Link></li>
                    <li><Link to="/managed-portfolios" onClick={toggleMenu}>Managed Portfolios</Link></li>
                    <li><Link to="/performance-tracking" onClick={toggleMenu}>Performance Tracking</Link></li>
                    <li><Link to="/onboarding" onClick={toggleMenu}>Onboarding</Link></li>
                  </ul>
                )}
              </li>
              <li className="mobile-nav-item">
                <button 
                  className="mobile-nav-button"
                  onClick={() => setOpenMobileNavSection(openMobileNavSection === 'section4' ? 'main' : 'section4')}
                  aria-expanded={openMobileNavSection === 'section4'}
                >
                  Resources
                  <span className="mobile-chevron">›</span>
                </button>
                {openMobileNavSection === 'section4' && (
                  <ul className="mobile-submenu">
                    <li><Link to="/learning" onClick={toggleMenu}>Learning</Link></li>
                    <li><Link to="/macro-insights" onClick={toggleMenu}>Macro Insights</Link></li>
                    <li><Link to="/risk-guidance" onClick={toggleMenu}>Risk Guidance</Link></li>
                    <li><Link to="/compliance" onClick={toggleMenu}>Compliance</Link></li>
                  </ul>
                )}
              </li>
              <li><Link to="/contact" onClick={toggleMenu}>Contact Us</Link></li>
              <li><Link to="/login" className="btn-login-mobile" onClick={toggleMenu}>Login</Link></li>
            </ul>
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
          />
          <div className="page-banner-overlay">
            <div className="page-banner-content">
              <h1 className="page-banner-title">Performance Tracking</h1>
              <p className="page-banner-subtitle">Transparent reporting</p>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="white-section">
          <div className="container">
            <div className="white-hero">
              <h2 className="white-hero-title">Access Your Investor Dashboard</h2>
              <p className="white-hero-subtitle">
                Secure onboarding grants access to your private investor panel, where performance tracking, monthly reporting, and full operational transparency are available from day one.
              </p>
              <button 
                className="btn btn-primary-white"
                onClick={() => {
                  navigate('/onboarding')
                  handleLinkClick()
                }}
              >
                Begin Investor Onboarding →
              </button>
            </div>
          </div>
        </section>

        {/* Performance Widgets Section */}
        <section className="white-section performance-widgets-section">
          <div className="container">
            <div className="performance-widgets-content">
              <div className="performance-widgets-header">
                <h2 className="performance-widgets-title">Performance Reports</h2>
                <p className="performance-widgets-subtitle">Download quarterly and annual performance reports</p>
              </div>
              
              <div className="performance-widgets-grid">
                {performanceWidgets.map((widget) => (
                  <div 
                    key={widget.id} 
                    className="performance-widget-card"
                    onMouseEnter={(e) => {
                      e.currentTarget.classList.add('hovered')
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.classList.remove('hovered')
                    }}
                  >
                    <div className="performance-widget-text">
                      <h3 className="performance-widget-title">{widget.title}</h3>
                      <p className="performance-widget-description">{widget.description}</p>
                    </div>
                    {widgetImages[widget.imageKey] && (
                      <div 
                        className="performance-widget-image"
                        style={{
                          backgroundImage: `url(${widgetImages[widget.imageKey]})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Additional Text Section */}
        <section className="white-section performance-text-section">
          <div className="container">
            <div className="performance-text-content">
              <p className="performance-text">
                Access to performance data, reports, and operational details is restricted to active investors only. All information is provided with full transparency, including strategy execution and risk parameters, without public distribution.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer handleLinkClick={handleLinkClick} />
    </div>
  )
}

export default PerformanceTrackingPage
