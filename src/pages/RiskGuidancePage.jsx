import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageStorage'
import './RiskGuidancePage.css'
import './HomePage.css'

const RiskGuidancePage = () => {
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [sectionImages, setSectionImages] = useState({
    section1: null,
    section2: null,
    section3: null,
    section4: null
  })
  
  // Refs for scroll navigation
  const sectionRefs = {
    introduction: useRef(null),
    probabilistic: useRef(null),
    structural: useRef(null),
    scope: useRef(null),
    treatment: useRef(null),
    fully: useRef(null),
    acknowledgment: useRef(null)
  }

  const scrollToSection = (sectionKey) => {
    const section = sectionRefs[sectionKey]?.current
    if (section) {
      const offset = 100
      const elementPosition = section.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      })
    }
  }
  
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
      const url = await getImageUrl('Risk-Guidance/OilMarketfundamentals.png')
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
    <div className="risk-guidance-page">
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
              <a href="#contact" className="contact-link">Contact Us</a>
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
        {/* Page Banner */}
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
              <h1 className="page-banner-title">Risk Guidance</h1>
              <p className="page-banner-subtitle">Probabilities and expectations</p>
            </div>
          </div>
        </section>

        {/* Navigation Section */}
        <section className="white-section risk-guidance-nav-section">
          <div className="container">
            <div className="risk-guidance-nav-grid">
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('introduction')}>
                Introduction
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('probabilistic')}>
                Probabilistic Nature
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('structural')}>
                Low-Risk Portfolio Structure
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('scope')}>
                Principal Protection Scope
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('treatment')}>
                Treatment of Capital
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('fully')}>
                Fully At-Risk Structure
              </button>
              <button className="risk-guidance-nav-item" onClick={() => scrollToSection('acknowledgment')}>
                Investor Acknowledgment
              </button>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="white-section risk-guidance-content-section">
          <div className="container">
            {/* Introduction Section */}
            <div className="risk-guidance-section" ref={sectionRefs.introduction}>
              <h2 className="risk-guidance-section-title">Risk Guidance</h2>
              <div className="risk-guidance-section-content">
                <p>This Risk Guidance section is intended to provide a structured and comprehensive explanation of how risk is defined, allocated, and interpreted within the portfolio frameworks offered. It is designed to support informed decision-making by clearly distinguishing between capital classifications, loss sequencing mechanisms, and probabilistic expectations, while reinforcing that all investment activity involves exposure to uncertainty and potential loss.</p>
                <p>Risk classifications described herein reflect internal structural design and capital treatment methodologies. They do not represent guarantees, assurances of outcome, or commitments regarding future performance. Market behavior, external events, and systemic conditions may materially affect results in ways that cannot be fully anticipated or mitigated.</p>
              </div>
            </div>

            {/* Probabilistic Nature of Investment Outcomes */}
            <div className="risk-guidance-section" ref={sectionRefs.probabilistic}>
              <h2 className="risk-guidance-section-title">Probabilistic Nature of Investment Outcomes</h2>
              <div className="risk-guidance-section-content">
                <p>All investment strategies operate within a probabilistic framework. Outcomes are influenced by a range of known and unknown variables, including market volatility, liquidity conditions, macroeconomic developments, and exogenous events. As such, investment results should be evaluated in terms of likelihoods and distributions rather than fixed or deterministic expectations.</p>
                <p>Any reference to expectations, projections, or modeled outcomes is intended to convey strategic intent and structural design rather than certainty of realization. Actual results may differ materially from anticipated scenarios, and unfavorable outcomes may occur even in environments that historically exhibited stability.</p>
                <p>Probability-based assessments do not eliminate risk and should not be interpreted as predictive statements. They serve solely as analytical tools to contextualize potential outcomes within a defined risk framework.</p>
              </div>
            </div>

            {/* Structural Definition of the Low-Risk Portfolio */}
            <div className="risk-guidance-section" ref={sectionRefs.structural}>
              <h2 className="risk-guidance-section-title">Structural Definition of the Low-Risk Portfolio</h2>
              <div className="risk-guidance-section-content">
                <p>The low-risk portfolio structure incorporates a predefined capital prioritization mechanism under which only the original invested principal is designated for downside protection under normal operating conditions. This designation is limited in scope and applies exclusively to the initial capital contribution at the point of allocation.</p>
                <p>This structural feature is designed to establish a clear and transparent hierarchy of capital treatment in adverse scenarios. It does not imply that the portfolio is immune to losses, nor does it suggest that total account value is protected from fluctuation or decline.</p>
                <p>The low-risk classification reflects relative risk exposure and capital sequencing, not the absence of market risk.</p>
              </div>
            </div>

            {/* Scope and Limitations of Principal Protection */}
            <div className="risk-guidance-section" ref={sectionRefs.scope}>
              <h2 className="risk-guidance-section-title">Scope and Limitations of Principal Protection</h2>
              <div className="risk-guidance-section-content">
                <p>The protection applied to initial invested capital is subject to defined operational parameters and assumes normal market functioning. It does not extend to conditions involving extreme volatility, systemic disruptions, or extraordinary market events where standard controls may be insufficient or temporarily suspended.</p>
                <p>Principal protection does not apply to:</p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>Performance-derived gains</li>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>Reinvested profits</li>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>Additional capital contributions during contract duration.</li>
                </ul>
                <p>Once gains are realized, they are explicitly excluded from protected capital designation and are treated as fully exposed to market risk.</p>
              </div>
            </div>

            {/* Treatment of Capital */}
            <div className="risk-guidance-section" ref={sectionRefs.treatment}>
              <h2 className="risk-guidance-section-title">Treatment of Capital</h2>
              <div className="risk-guidance-section-content">
                <p>All gains generated within the low-risk portfolio are classified as non-protected capital. These gains are fully exposed to market risk and may be partially or fully lost during periods of adverse performance.</p>
                <p>This distinction ensures that protective mechanisms do not expand automatically as account value increases. The preservation framework is intentionally limited to the original capital contribution to prevent compounding risk exposure under the appearance of protection.</p>
                <p>Accordingly, while total account equity may increase over time, the scope of protected capital remains fixed unless otherwise explicitly redefined.</p>
                <p>Historical performance data may demonstrate periods in which the low-risk portfolio did not experience losses to initial invested capital. Such observations are retrospective in nature and do not alter the underlying probabilistic characteristics of future outcomes.</p>
                <p>The absence of historical losses within a given timeframe should not be interpreted as evidence of guaranteed capital preservation or reduced future risk. Risk guidance is based on structural design and capital treatment rules rather than historical results.</p>
                <p>Performance outcomes may vary materially across time periods, market regimes, and external conditions.</p>
              </div>
            </div>

            {/* Fully At-Risk Portfolio Structure */}
            <div className="risk-guidance-section" ref={sectionRefs.fully}>
              <h2 className="risk-guidance-section-title">Fully At-Risk Portfolio Structure</h2>
              <div className="risk-guidance-section-content">
                <p>The fully at-risk portfolio is structured without capital prioritization or protective sequencing. All invested capital is exposed to market risk from inception, and losses are applied directly to total account value.</p>
                <p>In this structure:</p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>There is no distinction between principal and gains.</li>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>All capital bears equal risk.</li>
                  <li style={{ marginBottom: '0.5rem', color: '#4b5563' }}>Losses, if incurred, are realized proportionally against invested amounts.</li>
                </ul>
                <p>This portfolio configuration is intended for participants who are willing to accept full exposure to both potential returns and potential losses in pursuit of higher variability in outcomes.</p>
              </div>
            </div>

            {/* Investor Acknowledgment */}
            <div className="risk-guidance-section" ref={sectionRefs.acknowledgment}>
              <h2 className="risk-guidance-section-title">Investor Acknowledgment</h2>
              <div className="risk-guidance-section-content">
                <p>No portfolio, strategy, or allocation is classified as risk-free. All investment activity is subject to market risk, operational risk, liquidity risk, and external systemic influences.</p>
                <p>References to "low risk" are relative descriptors intended to differentiate capital treatment and exposure levels. They should not be interpreted as assurances of loss avoidance or as substitutes for independent risk assessment.</p>
                <p>Participation in any portfolio structure requires acknowledgment of the inherent uncertainty of financial markets and acceptance of potential losses, including the loss of invested capital.</p>
                <p>Investors are responsible for ensuring that any allocation aligns with their individual financial circumstances, investment objectives, and tolerance for risk. Capital should only be committed where adverse outcomes can be sustained without compromising financial stability.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

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
                  <li><Link to="/careers" onClick={handleLinkClick}>Careers</Link></li>
                  <li><Link to="/contact" onClick={handleLinkClick}>Contact</Link></li>
                  <li><a href="#">News</a></li>
                </ul>
              </div>
            </div>
          </div>
          <button 
            className="menu-toggle" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className={openMobileNavSection === 'main' ? 'open' : ''}></span>
            <span className={openMobileNavSection === 'main' ? 'open' : ''}></span>
          </button>
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

export default RiskGuidancePage
