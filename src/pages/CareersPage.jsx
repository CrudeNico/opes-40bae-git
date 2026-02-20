import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './CareersPage.css'
import './HomePage.css'
import { getImageUrl } from '../utils/imageStorage'
import Footer from '../components/Footer'

const CareersPage = () => {
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const jobsSectionRef = useRef(null)
  
  // Job search state
  const [jobSearch, setJobSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [selectedPostingDate, setSelectedPostingDate] = useState('All Dates')
  const [sortBy, setSortBy] = useState('postingDate')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showPostingDateDropdown, setShowPostingDateDropdown] = useState(false)
  const [savedJobs, setSavedJobs] = useState(new Set())
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    age: '',
    letter: '',
    cvFile: null,
    cvFileName: ''
  })
  const [cvUploaded, setCvUploaded] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)
  const [showTalentNetwork, setShowTalentNetwork] = useState(false)
  const [talentNetworkEmail, setTalentNetworkEmail] = useState('')
  const [talentNetworkJoined, setTalentNetworkJoined] = useState(false)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [videoWidgetImageUrl, setVideoWidgetImageUrl] = useState(null)
  const [sectionImages, setSectionImages] = useState({
    section1: null,
    section2: null,
    section3: null,
    section4: null
  })
  
  // Job listings data
  const [jobs] = useState([
    {
      id: 1,
      title: 'Quantitative Trading Developer (Energy Markets)',
      location: 'Madrid or Amsterdam',
      remote: 'Hybrid / Remote (EU time zone required)',
      hours: '40–55 hours/week (market-driven)',
      categories: ['Trading', 'Technology', 'Quantitative'],
      description: 'Design, build, and maintain trading systems used in live energy markets. This role sits directly between strategy and execution.',
      roleOverview: 'You will design, build, and maintain trading systems used in live energy markets. This role sits directly between strategy and execution. Code you write will size risk, route orders, and manage real capital in real time.',
      keyResponsibilities: [
        'Develop and maintain algorithmic trading logic and execution tools',
        'Build data pipelines for market data, signals, and performance analytics',
        'Optimize systems for robustness, latency, and fault tolerance',
        'Work closely with traders and analysts to translate strategies into code',
        'Monitor live systems and resolve production issues when markets are open'
      ],
      requirements: [
        'Strong Python experience (mandatory); familiarity with async systems',
        'Understanding of futures, derivatives, and risk metrics',
        'Experience with production-grade systems (not just research code)',
        'Comfortable working under time pressure when markets are live'
      ],
      preferred: [
        'CFA Level I or progress toward it (nice-to-have, not mandatory)',
        'Background in commodities or energy markets is a strong advantage'
      ],
      postingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago (this week)
    },
    {
      id: 2,
      title: 'Energy Market Analyst',
      location: 'London or Madrid',
      remote: 'Fully remote available',
      hours: '40–45 hours/week',
      categories: ['Analysis', 'Research', 'Energy Markets'],
      description: 'Analyze physical and financial energy markets and turn complex data into actionable insight.',
      roleOverview: 'You will analyze physical and financial energy markets and turn complex data into actionable insight. This role feeds directly into trading decisions, risk assessment, and investor communication.',
      keyResponsibilities: [
        'Analyze supply–demand dynamics, macro drivers, and geopolitical risks',
        'Track inventories, production, transport, and regulatory developments',
        'Produce structured reports and concise market commentary',
        'Support trading and investment teams with data-driven insights',
        'Maintain analytical models and dashboards'
      ],
      requirements: [
        'Strong understanding of oil, gas, power, or environmental commodities',
        'Ability to synthesize data into clear conclusions',
        'Proficiency in Excel; Python or BI tools preferred',
        'Strong written communication skills'
      ],
      preferred: [
        'CFA Level I or II preferred',
        'Degree in economics, finance, engineering, or energy-related fields'
      ],
      postingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 15 days ago (this month)
    },
    {
      id: 3,
      title: 'Backend Software Engineer (Platform & Infrastructure)',
      location: 'Amsterdam or Dubai',
      remote: 'Hybrid only',
      hours: '40–50 hours/week',
      categories: ['Technology', 'Software Engineering', 'Infrastructure'],
      description: 'Work on the core infrastructure that supports trading, client portals, and internal operations.',
      roleOverview: 'You will work on the core infrastructure that supports trading, client portals, and internal operations. This role prioritizes reliability, security, and scalability over experimentation.',
      keyResponsibilities: [
        'Build and maintain backend services, APIs, and databases',
        'Ensure data integrity for financial and trading information',
        'Implement security best practices and access controls',
        'Support deployment, monitoring, and incident response',
        'Collaborate with frontend and trading teams'
      ],
      requirements: [
        'Strong backend experience (Node.js, Python, or similar)',
        'Experience with cloud infrastructure and databases',
        'Understanding of system security and reliability',
        'Comfortable working with sensitive financial data'
      ],
      preferred: [
        'Cloud certifications (AWS, GCP, Azure) preferred',
        'Experience in fintech or trading environments is a plus'
      ],
      postingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days ago (this week)
    },
    {
      id: 4,
      title: 'Client & Investment Relations Manager',
      location: 'Madrid or Dubai',
      remote: 'Partial (on-site preferred)',
      hours: '35–45 hours/week',
      categories: ['Client Relations', 'Investment', 'Management'],
      description: 'Manage professional relationships with investors and partners. Requires financial literacy and discretion.',
      roleOverview: 'You will manage professional relationships with investors and partners. This role requires financial literacy, discretion, and the ability to explain performance and risk clearly and accurately.',
      keyResponsibilities: [
        'Handle investor onboarding and ongoing communication',
        'Prepare and explain performance reports and account updates',
        'Coordinate with trading and operations teams on client matters',
        'Maintain high standards of confidentiality and professionalism',
        'Support capital inflows, withdrawals, and documentation'
      ],
      requirements: [
        'Strong understanding of investment products and performance metrics',
        'Client-facing experience in finance, banking, or asset management',
        'Excellent written and verbal communication skills',
        'High attention to detail and discretion'
      ],
      preferred: [
        'CFA Level I or equivalent financial qualification preferred',
        'Experience working with HNW or professional investors'
      ],
      postingDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 200 days ago (this year, not this month)
    },
    {
      id: 5,
      title: 'Risk & Compliance Associate (Trading Operations)',
      location: 'London or Amsterdam',
      remote: 'No',
      hours: '40 hours/week',
      categories: ['Risk Management', 'Compliance', 'Operations'],
      description: 'Support trading operations by monitoring risk exposure, enforcing controls, and ensuring processes are followed.',
      roleOverview: 'You will support trading operations by monitoring risk exposure, enforcing controls, and ensuring processes are followed. This is a control function with real authority to challenge decisions.',
      keyResponsibilities: [
        'Monitor portfolio exposure, limits, and risk metrics',
        'Review trading activity and operational processes',
        'Support internal controls and compliance procedures',
        'Coordinate with traders and management on risk issues',
        'Assist with audits and regulatory documentation'
      ],
      requirements: [
        'Solid understanding of trading risk and financial operations',
        'Strong analytical and process-driven mindset',
        'Ability to act independently and challenge decisions',
        'High integrity and attention to detail'
      ],
      preferred: [
        'FRM (Financial Risk Manager) strongly preferred',
        'CFA Level I or II also relevant'
      ],
      postingDate: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 300 days ago (this year, not this month)
    }
  ])

  // Main categories (limited to 4)
  const allCategories = ['Technology', 'Trading', 'Management', 'Compliance']

  // Filter jobs based on search, location, category, and posting date
  const filteredJobs = jobs.filter(job => {
    // Job title/keyword search
    const matchesSearch = !jobSearch.trim() || 
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.description.toLowerCase().includes(jobSearch.toLowerCase())

    // Location search
    const matchesLocation = !locationSearch.trim() ||
      job.location.toLowerCase().includes(locationSearch.toLowerCase())

    // Category filter
    const matchesCategory = selectedCategory === 'All Categories' ||
      job.categories.includes(selectedCategory)

    // Posting date filter
    let matchesPostingDate = true
    if (selectedPostingDate !== 'All Dates') {
      const jobDate = new Date(job.postingDate)
      const today = new Date()
      const daysDiff = Math.floor((today - jobDate) / (1000 * 60 * 60 * 24))

      if (selectedPostingDate === 'This week') {
        matchesPostingDate = daysDiff <= 7
      } else if (selectedPostingDate === 'This month') {
        matchesPostingDate = daysDiff <= 30
      } else if (selectedPostingDate === 'This year') {
        matchesPostingDate = daysDiff <= 365
      }
    }

    return matchesSearch && matchesLocation && matchesCategory && matchesPostingDate
  })
  
  const toggleMenu = () => {
    if (openMobileNavSection === null || openMobileNavSection === 'main') {
      setOpenMobileNavSection(openMobileNavSection === 'main' ? null : 'main')
    } else {
      // If a section is open, just close it but keep menu open
      setOpenMobileNavSection('main')
    }
  }

  // Handle hover navigation with delay
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

  // Toggle saved job
  const toggleSavedJob = (jobId, e) => {
    e.stopPropagation()
    setSavedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  // Handle CV upload
  const handleCvUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setApplicationData(prev => ({
        ...prev,
        cvFile: file,
        cvFileName: file.name
      }))
      setCvUploaded(true)
    }
  }

  // Handle application form submission
  const handleApplicationSubmit = () => {
    setApplicationSubmitted(true)
  }

  // Handle talent network join
  const handleTalentNetworkJoin = () => {
    if (talentNetworkEmail.trim()) {
      setTalentNetworkJoined(true)
    }
  }

  // Reset application form when modal closes
  const handleCloseApplicationForm = () => {
    setShowApplicationForm(false)
    setApplicationSubmitted(false)
    setCvUploaded(false)
    setApplicationData({
      name: '',
      email: '',
      age: '',
      letter: '',
      cvFile: null,
      cvFileName: ''
    })
  }

  // Reset talent network when modal closes
  const handleCloseTalentNetwork = () => {
    setShowTalentNetwork(false)
    setTalentNetworkJoined(false)
    setTalentNetworkEmail('')
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.jobs-filter-dropdown-wrapper')) {
        setShowCategoryDropdown(false)
        setShowPostingDateDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Load images from Firebase Storage
  useEffect(() => {
    const loadImages = async () => {
      // Load banner image
      const bannerUrl = await getImageUrl('careers/212.jpg')
      if (bannerUrl) setBannerImageUrl(bannerUrl)

      // Load video widget image
      const videoWidgetUrl = await getImageUrl('careers/2122.jpeg')
      if (videoWidgetUrl) setVideoWidgetImageUrl(videoWidgetUrl)

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

  return (
    <div className="careers-page">
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
          >
          </div>
          <div className="page-banner-overlay">
            <div className="page-banner-content">
              <h1 className="page-banner-title">Careers</h1>
              <p className="page-banner-subtitle">Build the future with Opessocius</p>
            </div>
          </div>
        </section>

        <section className="white-section">
          <div className="container">
            {/* Hero Section */}
            <div className="white-hero">
              <h2 className="white-hero-title">Build With Us in Global Commodity Markets</h2>
              <p className="white-hero-subtitle">
                From trading and technology to operations and risk, we hire people who design, operate, and scale real market infrastructure. If you want responsibility, measurable impact, and exposure, explore our open roles.
              </p>
            </div>
          </div>
        </section>

        {/* Job Listings Section */}
        <section className="jobs-section" ref={jobsSectionRef}>
          <div className="container">
            {/* Search Bar */}
            <div className="jobs-search-bar">
              <div className="jobs-search-inputs">
                <div className="jobs-search-field">
                  <label className="jobs-search-label">FIND JOBS</label>
                  <input
                    type="text"
                    className="jobs-search-input"
                    placeholder="Job title, skill, keyword"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                  />
                </div>
                <div className="jobs-search-field">
                  <label className="jobs-search-label">NEAR LOCATION</label>
                  <input
                    type="text"
                    className="jobs-search-input"
                    placeholder="City, state, country"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                </div>
                <button className="jobs-search-button" aria-label="Search jobs">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 19L13 13M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters and Sort */}
            <div className="jobs-filters">
              <div className="jobs-count">{filteredJobs.length} OPEN JOBS</div>
              <div className="jobs-filter-buttons">
                <div className="jobs-filter-dropdown-wrapper">
                  <button 
                    className="jobs-filter-btn"
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown)
                      setShowPostingDateDropdown(false)
                    }}
                  >
                    CATEGORIES
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
                      <path d="M6 9L1 4L2.5 2.5L6 6L9.5 2.5L11 4L6 9Z" fill="currentColor"/>
                    </svg>
                  </button>
                  {showCategoryDropdown && (
                    <div className="jobs-filter-dropdown">
                      <button
                        className={`jobs-filter-dropdown-item ${selectedCategory === 'All Categories' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory('All Categories')
                          setShowCategoryDropdown(false)
                        }}
                      >
                        All Categories
                      </button>
                      {allCategories.map(category => (
                        <button
                          key={category}
                          className={`jobs-filter-dropdown-item ${selectedCategory === category ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedCategory(category)
                            setShowCategoryDropdown(false)
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="jobs-filter-dropdown-wrapper">
                  <button 
                    className="jobs-filter-btn"
                    onClick={() => {
                      setShowPostingDateDropdown(!showPostingDateDropdown)
                      setShowCategoryDropdown(false)
                    }}
                  >
                    POSTING DATES
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '4px' }}>
                      <path d="M6 9L1 4L2.5 2.5L6 6L9.5 2.5L11 4L6 9Z" fill="currentColor"/>
                    </svg>
                  </button>
                  {showPostingDateDropdown && (
                    <div className="jobs-filter-dropdown">
                      <button
                        className={`jobs-filter-dropdown-item ${selectedPostingDate === 'All Dates' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPostingDate('All Dates')
                          setShowPostingDateDropdown(false)
                        }}
                      >
                        All Dates
                      </button>
                      <button
                        className={`jobs-filter-dropdown-item ${selectedPostingDate === 'This week' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPostingDate('This week')
                          setShowPostingDateDropdown(false)
                        }}
                      >
                        This week
                      </button>
                      <button
                        className={`jobs-filter-dropdown-item ${selectedPostingDate === 'This month' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPostingDate('This month')
                          setShowPostingDateDropdown(false)
                        }}
                      >
                        This month
                      </button>
                      <button
                        className={`jobs-filter-dropdown-item ${selectedPostingDate === 'This year' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPostingDate('This year')
                          setShowPostingDateDropdown(false)
                        }}
                      >
                        This year
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Job Listings Grid */}
            <div className="jobs-grid">
              {filteredJobs.map((job) => (
                <div key={job.id} className="job-card" onClick={() => setSelectedJob(job)}>
                  <div className="job-card-header">
                    <h3 className="job-card-title">{job.title}</h3>
                    <div className="job-card-actions">
                      <button 
                        className="job-card-icon-btn" 
                        aria-label="Save job"
                        onClick={(e) => toggleSavedJob(job.id, e)}
                      >
                        {savedJobs.has(job.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="18" height="18">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="job-card-location">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <span>{job.location}</span>
                  </div>
                  <div className="job-card-meta">
                    <span className="job-card-remote">{job.remote}</span>
                    <span className="job-card-hours">{job.hours}</span>
                  </div>
                  <div className="job-card-categories">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4H13M3 8H13M3 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{job.categories.join(', ')}</span>
                  </div>
                  <p className="job-card-description">{job.description}</p>
                </div>
              ))}
              
              {/* Talent Network Card */}
              <div className="job-card talent-network-card">
                <h3 className="job-card-title">Talent Network</h3>
                <p className="job-card-description">Didn't find the perfect job? Create a profile so we can help</p>
                <button className="job-card-network-btn" onClick={() => setShowTalentNetwork(true)}>JOIN THE NETWORK</button>
              </div>
            </div>
          </div>
        </section>

        {/* Job Detail Modal */}
        {selectedJob && !showApplicationForm && (
          <div className="job-modal-overlay" onClick={() => setSelectedJob(null)}>
            <div className="job-modal" onClick={(e) => e.stopPropagation()}>
              <button className="job-modal-close" onClick={() => setSelectedJob(null)} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="job-modal-content">
                <h2 className="job-modal-title">{selectedJob.title}</h2>
                <div className="job-modal-info">
                  <div className="job-modal-info-item">
                    <strong>Location:</strong> {selectedJob.location}
                  </div>
                  <div className="job-modal-info-item">
                    <strong>Remote:</strong> {selectedJob.remote}
                  </div>
                  <div className="job-modal-info-item">
                    <strong>Hours:</strong> {selectedJob.hours}
                  </div>
                </div>
                
                <div className="job-modal-section">
                  <h3 className="job-modal-section-title">Role Overview</h3>
                  <p className="job-modal-text">{selectedJob.roleOverview}</p>
                </div>

                <div className="job-modal-section">
                  <h3 className="job-modal-section-title">Key Responsibilities</h3>
                  <ul className="job-modal-list">
                    {selectedJob.keyResponsibilities.map((responsibility, index) => (
                      <li key={index}>{responsibility}</li>
                    ))}
                  </ul>
                </div>

                <div className="job-modal-section">
                  <h3 className="job-modal-section-title">Requirements</h3>
                  <ul className="job-modal-list">
                    {selectedJob.requirements.map((requirement, index) => (
                      <li key={index}>{requirement}</li>
                    ))}
                  </ul>
                </div>

                <div className="job-modal-section">
                  <h3 className="job-modal-section-title">Preferred / Certifications</h3>
                  <ul className="job-modal-list">
                    {selectedJob.preferred.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="job-modal-actions">
                  <button className="job-modal-apply-btn" onClick={() => setShowApplicationForm(true)}>Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Form Modal */}
        {showApplicationForm && selectedJob && (
          <div className="job-modal-overlay" onClick={handleCloseApplicationForm}>
            <div className="job-modal job-application-modal" onClick={(e) => e.stopPropagation()}>
              <button className="job-modal-close" onClick={handleCloseApplicationForm} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="job-modal-content">
                {!applicationSubmitted ? (
                  <>
                    <h2 className="job-modal-title">Apply for {selectedJob.title}</h2>
                    <div className="application-form">
                      <div className="application-form-field">
                        <label className="application-form-label">Name</label>
                        <input
                          type="text"
                          className="application-form-input"
                          value={applicationData.name}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="application-form-field">
                        <label className="application-form-label">Email</label>
                        <input
                          type="email"
                          className="application-form-input"
                          value={applicationData.email}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div className="application-form-field">
                        <label className="application-form-label">Age</label>
                        <input
                          type="number"
                          className="application-form-input"
                          value={applicationData.age}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, age: e.target.value }))}
                          placeholder="Enter your age"
                        />
                      </div>
                      <div className="application-form-field">
                        <label className="application-form-label">Letter of Recommendation</label>
                        <textarea
                          className="application-form-textarea"
                          value={applicationData.letter}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, letter: e.target.value }))}
                          placeholder="Enter your letter of recommendation"
                          rows="5"
                        />
                      </div>
                      <div className="application-form-field">
                        <label className="application-form-label">Curriculum Vitae</label>
                        <div className="application-form-file-upload">
                          <input
                            type="file"
                            id="cv-upload"
                            className="application-form-file-input"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCvUpload}
                          />
                          <label htmlFor="cv-upload" className="application-form-file-label">
                            {cvUploaded ? (
                              <span className="application-form-file-uploaded">
                                ✓ {applicationData.cvFileName}
                              </span>
                            ) : (
                              <span>Choose file to upload</span>
                            )}
                          </label>
                        </div>
                      </div>
                      <div className="application-form-actions">
                        {cvUploaded ? (
                          <button className="job-modal-apply-btn" onClick={handleApplicationSubmit}>
                            Send
                          </button>
                        ) : (
                          <button className="job-modal-apply-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                            Proceed
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="application-success">
                    <div className="application-success-icon">✓</div>
                    <h2 className="job-modal-title">Your information has been saved</h2>
                    <p className="application-success-text">
                      In the case of procedure, to an interview you will receive an email.
                    </p>
                    <button className="job-modal-apply-btn" onClick={handleCloseApplicationForm}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Talent Network Modal */}
        {showTalentNetwork && (
          <div className="job-modal-overlay" onClick={handleCloseTalentNetwork}>
            <div className="job-modal talent-network-modal" onClick={(e) => e.stopPropagation()}>
              <button className="job-modal-close" onClick={handleCloseTalentNetwork} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="job-modal-content">
                {!talentNetworkJoined ? (
                  <>
                    <h2 className="job-modal-title">Join the Talent Network</h2>
                    <div className="application-form">
                      <div className="application-form-field">
                        <label className="application-form-label">Email</label>
                        <input
                          type="email"
                          className="application-form-input"
                          value={talentNetworkEmail}
                          onChange={(e) => setTalentNetworkEmail(e.target.value)}
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div className="application-form-actions">
                        <button 
                          className="job-modal-apply-btn" 
                          onClick={handleTalentNetworkJoin}
                          disabled={!talentNetworkEmail.trim()}
                          style={!talentNetworkEmail.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          Proceed
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="application-success">
                    <div className="application-success-icon">✓</div>
                    <h2 className="job-modal-title">Perfect. You are now in the network</h2>
                    <button className="job-modal-apply-btn" onClick={handleCloseTalentNetwork}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer handleLinkClick={handleLinkClick} />
    </div>
  )
}

export default CareersPage
