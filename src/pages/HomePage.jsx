import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore'
import { auth } from '../firebase/config'
import { sendConsultationConfirmationEmail } from '../firebase/email'
import { getImageUrl } from '../utils/imageStorage'
import Footer from '../components/Footer'
import './HomePage.css'

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="btn-arrow-icon" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
)

const HomePage = () => {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  
  // Handler to navigate and scroll to top
  const handleNavigateToTop = (path) => {
    navigate(path)
    // Scroll immediately and also after a delay to ensure it works
    window.scrollTo({ top: 0, behavior: 'instant' })
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 500)
  }
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [expandedFooterSection, setExpandedFooterSection] = useState(null)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [expandedMobileSection, setExpandedMobileSection] = useState(null)
  const [openNavSection, setOpenNavSection] = useState(null)
  const [openMobileNavSection, setOpenMobileNavSection] = useState(null)
  const [dropdownFading, setDropdownFading] = useState(false)
  const dropdownRef = useRef(null)
  const navItemsRef = useRef({ section1: null, section2: null, section3: null, section4: null })
  const dropdownWidgetRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoCoverImageUrl, setVideoCoverImageUrl] = useState(null)
  const [profileImageUrl, setProfileImageUrl] = useState(null)
  const [transactImageUrl, setTransactImageUrl] = useState(null)
  const [featuredImages, setFeaturedImages] = useState({})
  const [ctaBackgroundUrl, setCtaBackgroundUrl] = useState(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoRef = useRef(null)
  const [loadingConsultation, setLoadingConsultation] = useState(false)
  const [consultationSuccess, setConsultationSuccess] = useState(false)
  const [consultationError, setConsultationError] = useState('')
  const [sectionImages, setSectionImages] = useState({
    section1: null,
    section2: null,
    section3: null,
    section4: null
  })
  const [tabImages, setTabImages] = useState({
    commodityMarket: null,
    tradersBrokers: null,
    assetOwners: null,
    capitalPartners: null,
    researchDevelopment: null,
    execution: null,
    capitalProtection: null
  })
  const [heroAnimationsReady, setHeroAnimationsReady] = useState(false)

  // Handle hover navigation - simple and stable
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
        }, 300)
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

  // Trigger hero animations on page load
  useEffect(() => {
    // Small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      setHeroAnimationsReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Load images and video from Firebase Storage
  useEffect(() => {
    const loadMedia = async () => {
      // Load video
      const videoUrl = await getImageUrl('homepage/Documentary.mp4')
      if (videoUrl) setVideoUrl(videoUrl)

      // Load video cover image
      const coverImageUrl = await getImageUrl('homepage/plant11.jpeg')
      if (coverImageUrl) setVideoCoverImageUrl(coverImageUrl)

      // Load profile image
      const profileUrl = await getImageUrl('homepage/diegorequena.JPG')
      if (profileUrl) setProfileImageUrl(profileUrl)

      // Load transact image
      const transactUrl = await getImageUrl('homepage/homepage.jpeg')
      if (transactUrl) setTransactImageUrl(transactUrl)

      // Load featured card images
      const featuredUrls = await Promise.all([
        getImageUrl('homepage/oilplant.jpeg'),
        getImageUrl('homepage/opec.jpeg'),
        getImageUrl('homepage/peace.jpeg'),
        getImageUrl('homepage/Managment.jpeg')
      ])
      setFeaturedImages({
        oilplant: featuredUrls[0],
        opec: featuredUrls[1],
        peace: featuredUrls[2],
        managment: featuredUrls[3]
      })

      // Load CTA background
      const ctaUrl = await getImageUrl('homepage/stockexchnage6.jpeg')
      if (ctaUrl) setCtaBackgroundUrl(ctaUrl)

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

      // Load tab widget images
      const tabImageUrls = await Promise.all([
        getImageUrl('Risk-Guidance/OilMarketfundamentals.png'),
        getImageUrl('Crude-Oil-Strategies/Stockexchange.jpeg'),
        getImageUrl('Learning/laptop.jpeg'),
        getImageUrl('partners/Managment.jpeg'),
        getImageUrl('Execution-&-Technology/layout.png'),
        getImageUrl('Execution-&-Technology/trfloor.jpeg'),
        getImageUrl('Execution-&-Technology/212.jpg')
      ])
      setTabImages({
        commodityMarket: tabImageUrls[0],
        tradersBrokers: tabImageUrls[1],
        assetOwners: tabImageUrls[2],
        capitalPartners: tabImageUrls[3],
        researchDevelopment: tabImageUrls[4],
        execution: tabImageUrls[5],
        capitalProtection: tabImageUrls[6]
      })
    }

    loadMedia()
  }, [])

  const handleVideoClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!videoUrl) {
      console.log('Video not loaded yet. Please upload Documentary.mp4 to Firebase Storage.')
      return
    }

    if (videoRef.current) {
      if (isVideoPlaying) {
        // If playing, pause it
        videoRef.current.pause()
        setIsVideoPlaying(false)
      } else {
        // If paused, play it with audio
        videoRef.current.muted = false
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err)
        })
        setIsVideoPlaying(true)
      }
    }
  }

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
          
          // Use viewport coordinates for fixed positioning
          // Extend 80px to the left and right (making it wider)
          const left = rect1.left - 80
          const width = (rect4.right - rect1.left) + 160 // Add 160px total (80px each side)
          const top = rect4.bottom + 24 // 24px = 1.5rem spacing (fixed uses viewport coordinates)
          
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

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if clicking on a nav-link-button
        if (!event.target.closest('.nav-link-button')) {
          setDropdownFading(true)
          setTimeout(() => {
            setActiveDropdown(null)
            setDropdownFading(false)
          }, 300)
        }
      }
    }

    const handleScroll = () => {
      // Get the header section position
      const header = document.querySelector('.header')
      if (header && activeDropdown) {
        const headerRect = header.getBoundingClientRect()
        // If scrolled away from the header (header is out of view), fade out dropdown
        if (headerRect.bottom < 100 && !dropdownFading) {
          setDropdownFading(true)
          setTimeout(() => {
            setActiveDropdown(null)
            setDropdownFading(false)
          }, 300)
        }
      }
    }

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [activeDropdown, dropdownFading])

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

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = []
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
      const isAvailable = !isPast && day % 3 !== 0 // Simple availability logic
      days.push({ day, date, isAvailable })
    }

    return days
  }

  const days = generateCalendarDays()

  const handleScheduleConsultation = async () => {
    if (!selectedDate || !selectedTime) {
      setConsultationError('Please select a date and time.')
      return
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      setConsultationError('Please fill in your name and email.')
      return
    }

    setLoadingConsultation(true)
    setConsultationError('')
    setConsultationSuccess(false)

    try {
      const db = getFirestore()
      const consultationData = {
        userName: formData.name.trim(),
        userEmail: formData.email.trim(),
        company: formData.company || '',
        date: Timestamp.fromDate(selectedDate),
        time: selectedTime,
        message: formData.message || '',
        status: 'pending',
        createdAt: Timestamp.now(),
        type: 'consultation',
        // Include userId if user is logged in, otherwise leave it null
        ...(auth.currentUser && { userId: auth.currentUser.uid })
      }

      await addDoc(collection(db, 'supportRequests'), consultationData)

      // Send confirmation email
      const emailResult = await sendConsultationConfirmationEmail(
        formData.email.trim(),
        formData.name.trim(),
        selectedDate,
        selectedTime
      )

      if (!emailResult.success) {
        console.error('Failed to send confirmation email:', emailResult.error)
        // Still show success message even if email fails
      }

      setConsultationSuccess(true)
      setSelectedDate(null)
      setSelectedTime('')
      setFormData({
        name: '',
        email: '',
        company: '',
        message: ''
      })
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setConsultationSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('Error submitting consultation:', error)
      setConsultationError('Failed to submit consultation request. Please try again.')
    } finally {
      setLoadingConsultation(false)
    }
  }

  return (
    <div className="home-page">
      <header className={`header ${heroAnimationsReady ? 'fade-in' : ''}`}>
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
              <span className={isMenuOpen ? 'open' : ''}></span>
              <span className={isMenuOpen ? 'open' : ''}></span>
            </button>
          </div>
          <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
            <ul className="mobile-nav-links">
              <li className="mobile-nav-item">
                <button 
                  className="mobile-nav-button"
                  onClick={() => {
                    if (!isMenuOpen) setIsMenuOpen(true)
                    setOpenMobileNavSection(openMobileNavSection === 'section1' ? null : 'section1')
                  }}
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
                  onClick={() => {
                    if (!isMenuOpen) setIsMenuOpen(true)
                    setOpenMobileNavSection(openMobileNavSection === 'section2' ? null : 'section2')
                  }}
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
                  onClick={() => {
                    if (!isMenuOpen) setIsMenuOpen(true)
                    setOpenMobileNavSection(openMobileNavSection === 'section3' ? null : 'section3')
                  }}
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
                  onClick={() => {
                    if (!isMenuOpen) setIsMenuOpen(true)
                    setOpenMobileNavSection(openMobileNavSection === 'section4' ? null : 'section4')
                  }}
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
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className={`hero-title-line1 ${heroAnimationsReady ? 'fade-in' : ''}`}>
                Monetize, Track and Trade Energy
              </span>
              <span className={`hero-title-line2 ${heroAnimationsReady ? 'fade-in' : ''}`}>
                & Environmental Commodities
              </span>
            </h1>
            <p className={`hero-subtitle ${heroAnimationsReady ? 'fade-in' : ''}`}>
              <span className="hero-subtitle-lead">
                Opessocius operates the world&apos;s largest integrated platform for the energy transition – trusted by
              </span>
              <span className="hero-subtitle-tail">
                financial institutions, corporations, governments, and leading global power producers worldwide.
              </span>
            </p>
            <div className={`hero-buttons ${heroAnimationsReady ? 'fade-in' : ''}`}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // Scroll to the "Daniel / How it works" advisor block.
                  const advisorSection = document.querySelector('.advisor-section')
                  const fallbackSection = document.querySelector('.third-widget-section')
                  if (advisorSection) {
                    advisorSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  } else if (fallbackSection) {
                    fallbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  } else {
                    // Fallback: scroll to contact section
                    navigate('/contact')
                  }
                }}
              >
                Talk to an Expert <ArrowIcon />
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  // Find the first white-hero section (Structured Capital Allocation)
                  const whiteHeroSections = document.querySelectorAll('.white-hero')
                  if (whiteHeroSections.length > 0) {
                    whiteHeroSections[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
              >
                Explore Platform
              </button>
            </div>
          </div>
          
          <div className={`partners-section ${heroAnimationsReady ? 'fade-in' : ''}`}>
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
              <h2 className="white-hero-title">Structured Capital Allocation</h2>
              <p className="white-hero-subtitle">
                Access professionally designed crude oil portfolio structures built around disciplined exposure, capital prioritization, and systematic execution frameworks.
              </p>
              <button 
                className="btn btn-primary-white"
                onClick={() => handleNavigateToTop('/investment-calculator')}
              >
                Calculate investment <ArrowIcon />
              </button>
            </div>

            {/* Video Widget */}
            <div className="video-widget">
              <div 
                className="video-container" 
                onClick={handleVideoClick} 
                style={{ 
                  cursor: videoUrl ? 'pointer' : 'default', 
                  position: 'relative',
                  width: '100%',
                  height: '100%'
                }}
              >
                {videoUrl ? (
                  <>
                    {/* Cover image - shown when video is not playing */}
                    {!isVideoPlaying && videoCoverImageUrl && (
                      <img
                        src={videoCoverImageUrl}
                        alt="Video cover"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '1rem',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          zIndex: 1
                        }}
                      />
                    )}
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="homepage-video"
                      controls={false}
                      preload="metadata"
                      muted={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '1rem',
                        display: isVideoPlaying ? 'block' : 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 2
                      }}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onEnded={() => setIsVideoPlaying(false)}
                      onError={(e) => {
                        console.error('Video error:', e)
                        setIsVideoPlaying(false)
                      }}
                      onClick={handleVideoClick}
                    />
                    {!isVideoPlaying && (
                      <div 
                        className="video-play-overlay" 
                        onClick={handleVideoClick}
                        style={{ cursor: 'pointer', zIndex: 3 }}
                      >
                        <div className="video-play-button">▶</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f3f4f6',
                    borderRadius: '1rem',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div className="video-play-button" style={{ color: '#9ca3af', opacity: 0.5, fontSize: '4rem' }}>▶</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.893 13.393-1.135-1.135a2.252 2.252 0 0 1-.421-.585l-1.08-2.16a.414.414 0 0 0-.663-.107.827.827 0 0 1-.812.21l-1.273-.363a.89.89 0 0 0-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 0 1-1.81 1.025 1.055 1.055 0 0 1-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 0 1-1.383-2.46l.007-.042a2.25 2.25 0 0 1 .29-.787l.09-.15a2.25 2.25 0 0 1 2.37-1.048l1.178.236a1.125 1.125 0 0 0 1.302-.795l.208-.73a1.125 1.125 0 0 0-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 0 1-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 0 1-1.458-1.137l1.411-2.353a2.25 2.25 0 0 0 .286-.76m11.928 9.869A9 9 0 0 0 8.965 3.525m11.928 9.868A9 9 0 1 1 8.965 3.525" />
                  </svg>
                </div>
                <h3 className="stat-title">Crude Oil Trading Expertise</h3>
                <p className="stat-description">Focused exclusively on physical and paper crude oil markets</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                  </svg>
                </div>
                <h3 className="stat-title">Capital-Backed Trading</h3>
                <p className="stat-description">Deploying investor capital to execute disciplined, proprietary crude oil trades</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
                  </svg>
                </div>
                <h3 className="stat-title">Market-Driven Strategy</h3>
                <p className="stat-description">Specialists in price discovery, risk management, and trading strategies within crude oil markets</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <h3 className="stat-title">Trusted Trading Partner</h3>
                <p className="stat-description">Working with producers, refiners, traders, and institutional counterparties worldwide</p>
              </div>
            </div>

            {/* Second Hero Section */}
            <div className="white-hero second-hero">
              <h2 className="white-hero-title">Portfolio Models Aligned With Risk Preference</h2>
              <p className="white-hero-subtitle">
                Explore a range of portfolio models designed to accommodate different risk profiles, capital objectives, and exposure preferences within a unified strategy framework.
              </p>
              <button 
                className="btn btn-primary-white"
                onClick={() => handleNavigateToTop('/portfolio-models')}
              >
                View portfolio models <ArrowIcon />
              </button>
            </div>

            {/* Tabbed Widget Section */}
            <div className="tabbed-widget-section">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
                  onClick={() => setActiveTab(0)}
                >
                  Commodity Market
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
                  Capital Partners
                </button>
                <button 
                  className={`tab-button ${activeTab === 4 ? 'active' : ''}`}
                  onClick={() => setActiveTab(4)}
                >
                  Research & Development
                </button>
                <button 
                  className={`tab-button ${activeTab === 5 ? 'active' : ''}`}
                  onClick={() => setActiveTab(5)}
                >
                  Execution
                </button>
                <button 
                  className={`tab-button ${activeTab === 6 ? 'active' : ''}`}
                  onClick={() => setActiveTab(6)}
                >
                  Capital Protection
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
                        <p className="widget-subtitle">COMMODITY MARKET</p>
                        <h3 className="widget-title">Trade with precision. Execute with confidence.</h3>
                        <p className="widget-description">
                          We work with producers, refiners, traders, and institutional participants active in crude oil markets, providing direct market access, disciplined execution, and informed trading strategies. Our focus is on efficient price discovery, risk management, and reliable counterparties across physical and paper crude oil transactions.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/crude-oil-strategies')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.commodityMarket ? (
                            <img src={tabImages.commodityMarket} alt="Commodity Market" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 1 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">TRADERS & BROKERS</p>
                        <h3 className="widget-title">Trade with confidence and efficiency.</h3>
                        <p className="widget-description">
                          Access direct market news, indicators, and market intelligence tailored specifically to crude oil trading. We enable traders to learn how to operate with speed, discipline, and clarity across physical and paper crude oil markets.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.tradersBrokers ? (
                            <img src={tabImages.tradersBrokers} alt="Traders and Brokers" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 2 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">ASSET OWNERS</p>
                        <h3 className="widget-title">Maximize the value of your assets.</h3>
                        <p className="widget-description">
                          Partner with us to optimize the performance of crude oil assets through informed market access, strategic trading, and disciplined risk management. We help asset owners navigate market cycles and unlock value.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/managed-portfolios')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.assetOwners ? (
                            <img src={tabImages.assetOwners} alt="Asset Owners" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 3 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">CAPITAL PARTNERS</p>
                        <h3 className="widget-title">Seamless capital access and movement.</h3>
                        <p className="widget-description">
                          We accept capital contributions and process withdrawals efficiently, providing investors and partners with clear structures, disciplined controls, and transparent capital management aligned with crude oil trading operations.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.capitalPartners ? (
                            <img src={tabImages.capitalPartners} alt="Capital Partners" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 4 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">RESEARCH & DEVELOPMENT</p>
                        <h3 className="widget-title">Driving insight through analysis and innovation.</h3>
                        <p className="widget-description">
                          We invest in continuous market research, quantitative analysis, and strategy development to refine our crude oil trading approach. Our focus is on data-driven decision-making, market structure analysis, and adapting to evolving global crude oil dynamics.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/macro-insights')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.researchDevelopment ? (
                            <img src={tabImages.researchDevelopment} alt="Research and Development" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 5 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">EXECUTION</p>
                        <h3 className="widget-title">Facilitating fast and reliable execution.</h3>
                        <p className="widget-description">
                          We work with strategic partners to enable efficient trade execution, dependable settlement, and operational reliability. Our partnerships support speed, liquidity access, and disciplined execution across crude oil markets.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/performance-tracking')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.execution ? (
                            <img src={tabImages.execution} alt="Execution" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 6 && (
                      <div className="widget-content">
                        <p className="widget-subtitle">CAPITAL PROTECTION</p>
                        <h3 className="widget-title">Invest with confidence and safeguards in place.</h3>
                        <p className="widget-description">
                          Investor capital is protected up to 100,000, with structured risk controls and disciplined capital management designed to prioritize preservation alongside performance in crude oil trading operations.
                        </p>
                        <div className="widget-buttons">
                          <button 
                            className="btn btn-primary-white"
                            onClick={() => handleNavigateToTop('/risk-management')}
                          >
                            Learn More <ArrowIcon />
                          </button>
                          <button 
                            className="btn btn-secondary-white"
                            onClick={() => handleNavigateToTop('/partners')}
                          >
                            Trading Platforms
                          </button>
                        </div>
                        <div className="widget-image-placeholder">
                          {tabImages.capitalProtection ? (
                            <img src={tabImages.capitalProtection} alt="Capital Protection" className="widget-tab-image" />
                          ) : (
                            'Image Placeholder'
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Third Hero Section */}
            <div className="white-hero third-hero">
              <h2 className="white-hero-title">Risk Management Built Into Every Allocation</h2>
              <p className="white-hero-subtitle">
                Understand the risk management principles, capital hierarchy, and protective mechanisms that govern exposure, drawdowns, and portfolio behavior across market conditions.
              </p>
              <button 
                className="btn btn-primary-white"
                onClick={() => handleNavigateToTop('/risk-management')}
              >
                View risk management <ArrowIcon />
              </button>
            </div>

            {/* Third Widget - Calendar */}
            <div className="third-widget-section">
              <div className="third-widget">
                {!selectedDate ? (
                  <div className="calendar-container">
                    <div className="calendar-layout">
                      <div className="advisor-section">
                        <div className="advisor-profile">
                          <div
                            className="advisor-avatar"
                            style={{
                              backgroundImage: profileImageUrl ? `url(${profileImageUrl})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <div className="live-indicator"></div>
                          </div>
                          <h4 className="advisor-name">Daniel</h4>
                          <p className="response-time-mobile">
                            receive a response within 24 hours
                          </p>
                        </div>
                        <div className="consultation-steps">
                          <h5 className="steps-title">How it works:</h5>
                          <div className="step-item">
                            <span className="step-number">1</span>
                            <p className="step-text">Select your preferred date</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">2</span>
                            <p className="step-text">Prepare your questions</p>
                          </div>
                          <div className="step-item">
                            <span className="step-number">3</span>
                            <p className="step-text">A specialist will contact you</p>
                          </div>
                        </div>
                      </div>
                      <div className="calendar-section">
                        <p className="mobile-description">
                          Schedule a appointment with a specialise investment advisor from our team
                          and get strated now!
                        </p>
                        <div className="calendar-widget">
                          <div className="calendar-header">
                            <button className="calendar-nav" onClick={handlePrevMonth}>
                              ‹
                            </button>
                            <h4 className="calendar-month">
                              {monthNames[currentMonth]} {currentYear}
                            </h4>
                            <button className="calendar-nav" onClick={handleNextMonth}>
                              ›
                            </button>
                          </div>
                          <div className="calendar-list-wrapper">
                            <div className="calendar-list-header">
                              {weekdays.map((day) => (
                                <span key={day} className="calendar-list-weekday">
                                  {day}
                                </span>
                              ))}
                            </div>
                            <div className="calendar-list">
                              {days.map((dayData, index) => {
                                if (dayData === null) {
                                  return null
                                }

                                const today = new Date(new Date().setHours(0, 0, 0, 0))
                                if (dayData.date < today) {
                                  return null
                                }

                                const isToday =
                                  dayData.date.toDateString() ===
                                  today.toDateString()

                                return (
                                  <button
                                    key={index}
                                    className={`calendar-list-item ${
                                      dayData.isAvailable ? 'available' : 'unavailable'
                                    }`}
                                    onClick={() =>
                                      dayData.isAvailable && setSelectedDate(dayData.date)
                                    }
                                    disabled={!dayData.isAvailable}
                                  >
                                    <div className="calendar-list-item-main">
                                      <span className="calendar-list-item-day">
                                        {dayData.day}
                                      </span>
                                      <div className="calendar-list-item-text">
                                        <span className="calendar-list-item-label">
                                          {weekdays[dayData.date.getDay()]}
                                        </span>
                                        <span className="calendar-list-item-date">
                                          {monthNames[currentMonth]} {dayData.day}, {currentYear}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="calendar-list-item-status">
                                      {isToday && (
                                        <span className="calendar-chip today">Today</span>
                                      )}
                                      {dayData.isAvailable ? (
                                        <span className="calendar-chip active">Available</span>
                                      ) : (
                                        <span className="calendar-chip muted">Unavailable</span>
                                      )}
                                    </div>
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
                            {timeSlots.map((time) => (
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

                        {consultationError && (
                          <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                            {consultationError}
                          </div>
                        )}
                        {consultationSuccess && (
                          <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', color: '#166534', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                            Consultation request submitted successfully! You will receive a confirmation email shortly. Please check your inbox and spam folder within 5 minutes.
                          </div>
                        )}
                        <button 
                          className="btn btn-primary-white submit-button" 
                          onClick={handleScheduleConsultation}
                          disabled={loadingConsultation || !selectedTime}
                        >
                          {loadingConsultation ? 'Submitting...' : 'Schedule Consultation'}
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
                <div 
                  className="image-placeholder"
                  style={{
                    backgroundImage: transactImageUrl ? `url(${transactImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px'
                  }}
                >
                </div>
              </div>
              <div className="light-blue-text">
                <h2 className="light-blue-title">
                  Transact efficiently
                  <br />
                  across commodities
                </h2>
                <p className="light-blue-subtitle">
                  One platform for the full range of energy and environmental commodities.
                  <br />
                  Delivering seamless access, real-time insights, and desk grade execution.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Learning & Insights Section */}
        <section className="white-section">
          <div className="container">
            <div className="featured-section-header">
              <h2 className="featured-section-title">Featured Learning & Insights</h2>
              <button 
                className="btn-view-all"
                onClick={() => handleNavigateToTop('/learning')}
              >
                View All <ArrowIcon />
              </button>
            </div>
            <div className="featured-cards-grid">
              <div className="featured-card">
                <div 
                  className="featured-card-image"
                  style={{
                    backgroundImage: featuredImages.oilplant ? `url(${featuredImages.oilplant})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">COMMODITIES, LEARNING MODULE</div>
                  <h3 className="featured-card-title">Commodity Markets & Energy Structure...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div 
                  className="featured-card-image"
                  style={{
                    backgroundImage: featuredImages.opec ? `url(${featuredImages.opec})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">SUPPLY, LEARNING MODULE</div>
                  <h3 className="featured-card-title">Global Supply & Production Dynamics...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div 
                  className="featured-card-image"
                  style={{
                    backgroundImage: featuredImages.peace ? `url(${featuredImages.peace})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">GEOPOLITICS, LEARNING MODULE</div>
                  <h3 className="featured-card-title">Geopolitical Risk & Market Impact...</h3>
                </div>
              </div>
              <div className="featured-card">
                <div 
                  className="featured-card-image"
                  style={{
                    backgroundImage: featuredImages.managment ? `url(${featuredImages.managment})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                </div>
                <div className="featured-card-content">
                  <div className="featured-card-tags">FUNDAMENTALS, LEARNING MODULE</div>
                  <h3 className="featured-card-title">Fundamental Drivers & Market Balance...</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="white-section">
          <div className="container">
            <div className="cta-widget">
              <div 
                className="cta-widget-background"
                style={{
                  backgroundImage: ctaBackgroundUrl ? `url(${ctaBackgroundUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
              </div>
              <div className="cta-widget-content">
                <h2 className="cta-title" style={{ color: '#ffffff' }}>Ready to transact with confidence</h2>
                <button 
                  className="btn btn-primary-white cta-button"
                  onClick={() => handleNavigateToTop('/contact')}
                >
                  Talk to an Expert <ArrowIcon />
                </button>
              </div>
            </div>
            <p className="disclaimer-text">
              Trading derivatives, including CFDs, futures, and options, involves significant risk of loss and may not be suitable for all investors. Market conditions can change rapidly, and the use of leverage may amplify both gains and losses. Past performance is not indicative of future results.
              <br /><br />
              The information, strategies, and market views provided by Opessocius Asset Management are for informational and educational purposes only and do not constitute investment advice, a recommendation, or an offer to buy or sell any financial instrument. Any use of this information is at the sole discretion and risk of the user.
              <br /><br />
              Users are responsible for ensuring that their activities comply with applicable laws and regulations in their jurisdiction. Opessocius Asset Management makes no guarantees regarding performance outcomes and assumes no liability for any losses incurred as a result of reliance on the information or strategies provided.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer handleLinkClick={handleLinkClick} />
    </div>
  )
}

export default HomePage
