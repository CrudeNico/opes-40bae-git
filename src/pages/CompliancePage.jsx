import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageStorage'
import './CompliancePage.css'
import './HomePage.css'

const CompliancePage = () => {
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  
  // Refs for scroll navigation
  const sectionRefs = {
    investment: useRef(null),
    market: useRef(null),
    strategy: useRef(null),
    risk: useRef(null),
    capital: useRef(null),
    operational: useRef(null),
    reporting: useRef(null)
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
      const url = await getImageUrl('Compliance/banner.jpg')
      if (url) setBannerImageUrl(url)
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
    <div className="compliance-page">
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
                              <Link to="/careers" onClick={handleLinkClick}>Compliance</Link>
                              <span className="nav-dropdown-widget-subtext">Legal and disclosures</span>
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
                          {/* Image area */}
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
                          {/* Image area */}
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
                          {/* Image area */}
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
                          {/* Image area */}
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
                    <li><Link to="/careers" onClick={toggleMenu}>Compliance</Link></li>
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
              <h1 className="page-banner-title">Compliance</h1>
              <p className="page-banner-subtitle">Legal and disclosures</p>
            </div>
          </div>
        </section>

        {/* Navigation Section */}
        <section className="white-section compliance-nav-section">
          <div className="container">
            <div className="compliance-nav-grid">
              <button className="compliance-nav-item" onClick={() => scrollToSection('investment')}>
                Investment Philosophy
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('market')}>
                Market Focus
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('strategy')}>
                Core Strategy Architecture
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('risk')}>
                Risk Management Framework
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('capital')}>
                Capital Protection
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('operational')}>
                Operational Process
              </button>
              <button className="compliance-nav-item" onClick={() => scrollToSection('reporting')}>
                Reporting Standards
              </button>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        <section className="white-section compliance-content-section">
          <div className="container">
            {/* Investment Philosophy */}
            <div className="compliance-section" ref={sectionRefs.investment}>
              <h2 className="compliance-section-title">Investment Philosophy</h2>
              <div className="compliance-section-content">
                <p>Our investment philosophy is founded on the systematic identification and disciplined exploitation of structural inefficiencies within global crude oil markets. We operate under the premise that energy markets are shaped by recurring and observable patterns driven by supply and demand imbalances, macroeconomic cycles, regulatory developments, and geopolitical events. When analyzed through robust quantitative frameworks, these dynamics create repeatable opportunities that can be addressed in a controlled, methodical, and non-discretionary manner.</p>
                <p>The primary objective of our strategy is to achieve consistent, risk-adjusted returns through disciplined exposure to crude oil price movements while maintaining a strong emphasis on capital preservation. The strategy is designed to participate in directional price trends while implementing comprehensive risk controls intended to mitigate drawdowns during periods of market stress or elevated volatility. Our objective is not absolute return maximization, but rather the delivery of sustainable performance profiles that are resilient across market regimes.</p>
                <p>We seek to generate returns that are superior on a risk-adjusted basis relative to passive benchmarks by employing active, rules-based position management, adaptive exposure sizing, and systematic entry and exit criteria. These processes are continuously evaluated to ensure alignment with prevailing market conditions, volatility environments, and liquidity considerations.</p>
                <p>Discretionary decision-making is intentionally excluded from the investment process. All trading decisions are derived from quantitative models that process multiple data inputs simultaneously, including price behavior, volatility regimes, volume dynamics, inter-market relationships, and fundamental inventory data. By eliminating emotional and behavioral biases, this framework promotes consistency, transparency, and repeatability in execution, which are essential characteristics for institutional-grade investment operations.</p>
              </div>
            </div>

            {/* Market Focus */}
            <div className="compliance-section" ref={sectionRefs.market}>
              <h2 className="compliance-section-title">Market Focus</h2>
              <div className="compliance-section-content">
                <p>The strategy is exclusively focused on crude oil markets, with primary exposure to West Texas Intermediate (WTI) and Brent crude oil futures and related derivative instruments. This narrow market focus allows for deep specialization, enabling detailed understanding of the structural drivers, seasonal behaviors, inventory cycles, transportation constraints, and geopolitical sensitivities that influence global oil pricing.</p>
                <p>Our opportunity set spans multiple time horizons, ranging from short-term tactical positioning driven by volatility dislocations to medium- and longer-term trend exposure arising from structural shifts in global supply and demand. The strategy is designed to adapt to varying market regimes, recognizing that different environments require distinct analytical emphasis and execution techniques while remaining consistent with the overarching systematic framework.</p>
                <p>Market analysis incorporates continuous assessment of factors including OPEC+ production policies, non-OPEC supply dynamics, refinery throughput, transportation bottlenecks, strategic petroleum reserve activity, inventory levels at key global storage hubs, and evolving demand patterns tied to economic growth, transportation usage, and industrial activity. These inputs are evaluated to identify periods where market pricing diverges from underlying fundamentals, creating conditions suitable for systematic engagement.</p>
                <p>In addition to direct crude oil market analysis, the strategy evaluates cross-market relationships with currencies, equity indices, interest rate markets, and related energy products. These inter-market dynamics often provide supplementary signals regarding macroeconomic trends, risk sentiment, and capital flows that may influence energy pricing. This broader analytical context enhances situational awareness while maintaining the strategy's core focus on crude oil market behavior.</p>
              </div>
            </div>

            {/* Core Strategy Architecture */}
            <div className="compliance-section" ref={sectionRefs.strategy}>
              <h2 className="compliance-section-title">Core Strategy Architecture</h2>
              <div className="compliance-section-content">
                <p>The strategy architecture is constructed around a multi-layered systematic framework designed to operate effectively across diverse market conditions. Quantitative models analyze price action, volatility measures, volume distributions, and fundamental indicators to generate trade signals that align with predefined risk and return parameters.</p>
                <p>Signal generation incorporates multiple analytical components, including statistically derived pattern recognition, momentum and trend indicators calibrated across different timeframes, volatility-adjusted entry conditions, and fundamental validation filters. This multi-factor structure is intended to enhance robustness, reduce reliance on any single input, and improve consistency of signal quality across market environments.</p>
                <p>Position sizing is governed by adaptive algorithms that account for account equity, prevailing market volatility, correlation with existing exposures, and predefined risk limits. This dynamic sizing process ensures that exposure levels remain proportionate to risk conditions and that capital is allocated efficiently without excessive concentration or leverage.</p>
                <p>Trade execution is governed by systematic protocols that emphasize precision, cost efficiency, and consistency. Orders are executed using predefined order types and execution logic, incorporating protective stop-loss mechanisms and profit-realization parameters established prior to trade entry. This approach ensures that trade management remains rule-based and immune to discretionary intervention.</p>
                <p>Real-time monitoring systems continuously assess portfolio exposure, correlation metrics, margin utilization, and compliance with risk constraints. Where applicable, automated alerts or predefined adjustment mechanisms are triggered to maintain alignment with the strategy's risk management framework under all market conditions.</p>
              </div>
            </div>

            {/* Risk Management Framework */}
            <div className="compliance-section" ref={sectionRefs.risk}>
              <h2 className="compliance-section-title">Risk Management Framework</h2>
              <div className="compliance-section-content">
                <p>Risk management is integral to every aspect of the strategy and serves as the primary filter through which all trading activity is evaluated. The framework operates across multiple dimensions, including individual trade risk, portfolio-level exposure, correlation analysis, and capital preservation controls.</p>
                <p>At the individual position level, strict risk limits cap maximum exposure relative to total account equity. These limits are dynamically adjusted based on prevailing volatility conditions, ensuring that risk per trade remains consistent across different market environments. Every position is accompanied by predefined exit criteria designed to limit downside exposure should market conditions evolve adversely.</p>
                <p>Portfolio-level risk controls monitor aggregate exposure, directional bias, and correlation among positions. These controls are designed to prevent excessive concentration in any single market view and to ensure that diversification remains meaningful even when multiple signals align in a similar direction.</p>
                <p>Volatility-adjusted exposure management reduces position sizes during periods of heightened uncertainty and expands exposure when market conditions stabilize. This adaptive approach is intended to protect capital during stressed environments while allowing efficient deployment of risk capital during favorable conditions.</p>
                <p>Drawdown management mechanisms include predefined thresholds that trigger exposure reduction, temporary trading restrictions, or mandatory review processes. These measures are designed to slow capital erosion, enforce discipline, and ensure that trading activity remains aligned with the strategy's long-term objectives.</p>
              </div>
            </div>

            {/* Capital Protection */}
            <div className="compliance-section" ref={sectionRefs.capital}>
              <h2 className="compliance-section-title">Capital Protection</h2>
              <div className="compliance-section-content">
                <p>Capital preservation is a foundational principle of the strategy and is supported by multiple, layered protection mechanisms. These controls are embedded within the trading infrastructure and operate automatically to ensure consistent application without reliance on discretionary judgment.</p>
                <p>Maximum drawdown thresholds are defined as percentage declines from peak equity levels and serve as absolute risk boundaries. As drawdown levels increase, progressively restrictive measures are implemented, including exposure reduction or temporary suspension of new trade initiation. This graduated approach prevents rapid capital depletion and enforces disciplined risk containment.</p>
                <p>Daily loss limits cap the maximum permissible loss within a single trading session. If these limits are reached or approached, the system may restrict further trade initiation or close existing positions, thereby preventing isolated market events from disproportionately impacting overall performance.</p>
                <p>Correlation-adjusted exposure limits recognize that multiple positions with similar directional characteristics may represent concentrated risk. These limits restrict aggregate exposure to correlated positions, ensuring that diversification objectives are maintained even during periods of strong thematic alignment across signals.</p>
                <p>Margin utilization is continuously monitored to prevent excessive leverage. Automated controls reduce exposure if margin usage approaches predefined thresholds, ensuring adequate liquidity buffers and reducing the risk of forced liquidation during adverse price movements.</p>
                <p>Recovery protocols are implemented following significant drawdowns, requiring confirmation that market conditions and risk metrics have normalized before full trading activity resumes. These protocols include systematic reviews of performance, risk alignment, and operational integrity.</p>
              </div>
            </div>

            {/* Operational Process */}
            <div className="compliance-section" ref={sectionRefs.operational}>
              <h2 className="compliance-section-title">Operational Process</h2>
              <div className="compliance-section-content">
                <p>The operational infrastructure supporting the strategy is designed to deliver reliability, transparency, and execution efficiency. The technology stack integrates market data acquisition, signal generation, risk management, order execution, and performance analytics into a cohesive operational framework.</p>
                <p>Market data is sourced from multiple providers to ensure redundancy and accuracy. Automated validation processes monitor data integrity and filter anomalous inputs to prevent erroneous signal generation or execution errors.</p>
                <p>Signal processing systems operate continuously, updating trade signals in response to evolving market conditions while enforcing compliance with predefined risk parameters. Trade recommendations are automatically validated prior to execution authorization.</p>
                <p>Order management systems execute trades according to predefined logic that prioritizes execution quality, cost efficiency, and regulatory compliance. These systems manage the full lifecycle of each position, including entry, risk controls, and exit execution.</p>
                <p>Risk monitoring infrastructure operates in real time, calculating exposure metrics, correlation measures, and compliance indicators. Automated alerts and predefined response mechanisms are triggered as risk thresholds are approached.</p>
                <p>Performance analytics systems record and evaluate all trading activity, generating detailed metrics on returns, risk characteristics, execution quality, and operational performance. These outputs support both internal oversight and external reporting requirements.</p>
                <p>Business continuity and disaster recovery protocols include redundant systems, regular data backups, and tested failover mechanisms to ensure operational resilience under adverse technical conditions.</p>
              </div>
            </div>

            {/* Reporting Standards */}
            <div className="compliance-section" ref={sectionRefs.reporting}>
              <h2 className="compliance-section-title">Reporting Standards</h2>
              <div className="compliance-section-content">
                <p>Performance reporting is conducted in accordance with institutional standards for transparency, consistency, and accuracy. Methodologies for return calculation, risk measurement, and benchmarking are clearly defined and applied consistently across reporting periods.</p>
                <p>Returns are calculated on both gross and net bases, accounting for transaction costs and applicable fees. Performance is reported across multiple time horizons and supplemented with risk-adjusted metrics to provide a comprehensive view of strategy characteristics.</p>
                <p>Attribution analysis decomposes performance by contributing factors such as market conditions, volatility regimes, trade duration, position sizing, and execution efficiency. This analysis supports ongoing evaluation and refinement of the systematic framework.</p>
                <p>Risk reporting includes disclosure of volatility measures, drawdown statistics, exposure concentrations, correlation metrics, and leverage utilization. These metrics are presented alongside returns to provide full context for performance evaluation.</p>
                <p>Benchmark comparisons are selected to reflect the strategy's market focus and risk profile, enabling meaningful assessment relative to passive alternatives and relevant peer strategies.</p>
                <p>Reporting is provided on a regular basis using standardized formats, with supplemental disclosures issued as needed during periods of significant market activity or performance deviation. Operational metrics, including system reliability and execution quality, are also reported to demonstrate infrastructure effectiveness and governance standards.</p>
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
                  <li><Link to="/careers" onClick={handleLinkClick}>Compliance</Link></li>
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

export default CompliancePage
