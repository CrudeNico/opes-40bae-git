import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getImageUrl } from '../utils/imageStorage'
import Footer from '../components/Footer'
import './ManagedPortfoliosPage.css'
import './HomePage.css'

const ManagedPortfoliosPage = () => {
  const navigate = useNavigate()
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [capitalValue, setCapitalValue] = useState(0)
  const [investorsValue, setInvestorsValue] = useState(0)
  const [returnValue, setReturnValue] = useState(0)
  const bigWidgetRef = useRef(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
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

  // Load banner image
  useEffect(() => {
    const loadBannerImage = async () => {
      const url = await getImageUrl('Managed-Portfolios/charts.jpeg')
      if (url) setBannerImageUrl(url)

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
    loadBannerImage()
  }, [])

  // Animate big widget numbers
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate capital (1.4 million)
            const animateCapital = () => {
              const duration = 2000 // 2 seconds
              const start = 0
              const end = 1.4
              const startTime = performance.now()

              const animate = (currentTime) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)
                const current = start + (end - start) * progress
                setCapitalValue(current)

                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
              requestAnimationFrame(animate)
            }

            // Animate investors (53)
            const animateInvestors = () => {
              const duration = 2000
              const start = 0
              const end = 53
              const startTime = performance.now()

              const animate = (currentTime) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)
                const current = Math.floor(start + (end - start) * progress)
                setInvestorsValue(current)

                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
              requestAnimationFrame(animate)
            }

            // Animate return (70.2%)
            const animateReturn = () => {
              const duration = 2000
              const start = 0
              const end = 70.2
              const startTime = performance.now()

              const animate = (currentTime) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)
                const current = start + (end - start) * progress
                setReturnValue(current)

                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
              requestAnimationFrame(animate)
            }

            // Start animations
            animateCapital()
            animateInvestors()
            animateReturn()

            // Unobserve after animation starts
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (bigWidgetRef.current) {
      observer.observe(bigWidgetRef.current)
    }

    return () => {
      if (bigWidgetRef.current) {
        observer.unobserve(bigWidgetRef.current)
      }
    }
  }, [])

  return (
    <div className="managed-portfolios-page">
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
              <li><a href="#contact" onClick={toggleMenu}>Contact Us</a></li>
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
              <h1 className="page-banner-title">Managed Portfolios</h1>
              <p className="page-banner-subtitle">Professionally managed capital</p>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="white-section">
          <div className="container">
            <div className="white-hero">
              <h2 className="white-hero-title">Segmented Portfolio Management</h2>
              <p className="white-hero-subtitle">
                Investors are grouped into dedicated portfolios based on allocated capital size and strategy profile, allowing operations to be managed independently. This structure improves execution control, risk isolation, and operational efficiency across different investment groups.
              </p>
              <button 
                className="btn btn-primary-white"
                onClick={() => {
                  navigate('/portfolio-models')
                  handleLinkClick()
                }}
              >
                Portfolio Models →
              </button>
            </div>
          </div>
        </section>

        {/* Big Widget Section */}
        <section className="white-section big-widget-section">
          <div className="container">
            <div className="big-widget" ref={bigWidgetRef}>
              <div className="big-widget-content">
                <div className="big-widget-stat">
                  <div className="big-widget-value">${capitalValue.toFixed(1)}M</div>
                  <div className="big-widget-label">Total Capital Under Management</div>
                </div>
                <div className="big-widget-stat">
                  <div className="big-widget-value">{investorsValue}+</div>
                  <div className="big-widget-label">Active Investors</div>
                </div>
                <div className="big-widget-stat">
                  <div className="big-widget-value">{returnValue.toFixed(1)}%</div>
                  <div className="big-widget-label">Annual Return Record</div>
                </div>
              </div>
              <div className="big-widget-text">
                <p>
                  Capital allocation is structured according to the amount invested. Investor funds are grouped internally to build managed trading accounts typically ranging between €100,000 and €200,000 per account. Once allocated, a dedicated advisor from our team is assigned to oversee all trading operations, execution, and portfolio adjustments for that group.
                </p>
                <p>
                  While all investors follow the same core strategy and market positioning, variations may occur in lot sizing, exposure, and risk distribution based on account size and timing. Position direction and overall portfolio logic remain aligned across accounts.
                </p>
                <p>
                  This account segmentation is intentional. Operating within defined balance limits enhances broker-level risk management and allows investors to benefit from capital protection frameworks provided by our partners, typically covering up to €100,000 per account. This structure prioritizes capital safety, operational control, and execution consistency while maintaining transparent oversight for each investor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Capital Allocation Section */}
        <section className="white-section investor-choice-section">
          <div className="container">
            <div className="investor-choice-content">
              <div className="investor-choice-text">
                <h2 className="investor-choice-title">Capital is allocated</h2>
                <p className="investor-choice-description">
                  More than half of capital invested is actively deployed, while the remaining portion is reserved as a margin and risk buffer. This allocation prioritizes capital protection, operational flexibility, and controlled exposure under varying market conditions.
                </p>
                <div className="investor-choice-stats">
                  <div className="stat-item">
                    <div className="stat-value">75%</div>
                    <div className="stat-label">Active Capital</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">25%</div>
                    <div className="stat-label">Non-Operational Capital</div>
                  </div>
                </div>
              </div>
              <div className="investor-choice-chart">
                <svg viewBox="0 0 200 200" className="pie-chart">
                  {/* Active Capital - 75% */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="40"
                    strokeDasharray={`${75 * 5.0265} ${100 * 5.0265}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 100 100)"
                    className="pie-segment active-capital"
                  />
                  {/* Non-Operational Capital - 25% */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="40"
                    strokeDasharray={`${25 * 5.0265} ${100 * 5.0265}`}
                    strokeDashoffset={`-${75 * 5.0265}`}
                    transform="rotate(-90 100 100)"
                    className="pie-segment non-operational"
                  />
                </svg>
                <div className="pie-chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
                    <span className="legend-label">Active Capital (75%)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="legend-label">Non-Operational Capital (25%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer handleLinkClick={handleLinkClick} />
    </div>
  )
}

export default ManagedPortfoliosPage
