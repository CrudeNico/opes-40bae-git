import React, { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import './Learning.css'

const Learning = ({ user, onStatusUpdate }) => {
  const [isLearner, setIsLearner] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    email: user?.email || '',
    country: '',
    phoneNumber: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedPaymentType, setSelectedPaymentType] = useState(null)
  const [learningProgress, setLearningProgress] = useState(0) // Progress percentage
  const [modulesState, setModulesState] = useState([
    { id: 'market-foundations', title: 'Market Foundations & Instruments', completed: false, progress: 0, completedSubModules: [] },
    { id: 'technical-analysis', title: 'Technical Analysis & Indicators', completed: false, progress: 0, completedSubModules: [] },
    { id: 'risk-management', title: 'Risk Management & Trade Execution', completed: false, progress: 0, completedSubModules: [] },
    { id: 'trading-psychology', title: 'Trading Psychology & Decision-Making', completed: false, progress: 0, completedSubModules: [] },
    { id: 'systems-setup', title: 'Systems, Accounts & Professional Setup', completed: false, progress: 0, completedSubModules: [] }
  ])
  const [currentView, setCurrentView] = useState('main') // 'main', 'sub-modules', 'content'
  const [selectedModule, setSelectedModule] = useState(null)
  const [selectedSubModule, setSelectedSubModule] = useState(null)
  const [subModules, setSubModules] = useState([])
  const [showUnderConstruction, setShowUnderConstruction] = useState(false)

  const monthlyPrice = 30 // Monthly price in EUR
  const oneTimePrice = 299 // One-time price in EUR
  const monthlyPaymentLink = 'https://stripe.opessocius.com/monthly' // Placeholder Stripe link
  const oneTimePaymentLink = 'https://stripe.opessocius.com/onetime' // Placeholder Stripe link

  useEffect(() => {
    checkLearnerStatus()
  }, [user])

  useEffect(() => {
    // Load learning modules from Firestore
    if (isLearner) {
      loadLearningModules()
      loadLearningProgress()
    }
  }, [isLearner, user])

  const loadLearningModules = async () => {
    try {
      const db = getFirestore()
      const modulesCollection = collection(db, 'learningModules')
      const modulesQuery = query(modulesCollection, orderBy('order', 'asc'))
      const modulesSnapshot = await getDocs(modulesQuery)
      
      const loadedModules = []
      modulesSnapshot.forEach((doc) => {
        const moduleData = doc.data()
        loadedModules.push({
          id: doc.id,
          title: moduleData.title,
          subtext: moduleData.subtext || '',
          completed: false,
          progress: 0,
          subModules: moduleData.subModules || []
        })
      })
      
      if (loadedModules.length > 0) {
        setModulesState(loadedModules)
      }
    } catch (error) {
      console.error('Error loading learning modules:', error)
    }
  }

  const loadLearningProgress = async () => {
    try {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const learningData = userData.learningData || {}
        const completedModules = learningData.completedModules || []
        
        // Calculate total sub-modules across all modules
        let totalSubModules = 0
        let completedSubModules = 0
        
        modulesState.forEach(module => {
          const moduleSubModules = module.subModules || []
          totalSubModules += moduleSubModules.length
          
          const moduleData = learningData.modules?.[module.id] || {}
          const moduleCompletedSubModules = moduleData.completedSubModules || []
          completedSubModules += moduleCompletedSubModules.length
        })
        
        // Calculate overall progress based on sub-modules
        const progress = totalSubModules > 0 ? (completedSubModules / totalSubModules) * 100 : 0
        setLearningProgress(progress)
        
        // Update modules with completion status and individual progress
        setModulesState(prevModules => 
          prevModules.map(module => {
            const moduleData = learningData.modules?.[module.id] || {}
            const moduleCompletedSubModules = moduleData.completedSubModules || []
            const moduleSubModules = module.subModules || []
            const moduleProgress = moduleSubModules.length > 0 
              ? (moduleCompletedSubModules.length / moduleSubModules.length) * 100 
              : 0
            
            // Module is completed only if all its sub-modules are completed
            const isModuleCompleted = moduleSubModules.length > 0 && 
              moduleCompletedSubModules.length === moduleSubModules.length
            
            return {
              ...module,
              completed: isModuleCompleted,
              progress: moduleProgress,
              completedSubModules: moduleCompletedSubModules
            }
          })
        )
      }
    } catch (error) {
      console.error('Error loading learning progress:', error)
    }
  }

  const checkLearnerStatus = async () => {
    try {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        let statuses = userData.statuses || []
        if (statuses.length === 0 && Array.isArray(userData.isAdmin) && userData.isAdmin.length > 0) {
          statuses = userData.isAdmin
        }
        if (statuses.length === 0 && userData.isAdmin === true) {
          statuses = ['Admin']
        }
        
        setIsLearner(statuses.includes('Learner'))
        // Check if learning access is pending
        setIsPending(userData.learningData && userData.learningData.status === 'pending')
      }
    } catch (error) {
      console.error('Error checking learner status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    // Validation
    if (!selectedPaymentType) {
      setError('Please select a payment option.')
      setSubmitting(false)
      return
    }
    
    if (!formData.country || !formData.phoneNumber) {
      setError('Please fill in all required fields.')
      setSubmitting(false)
      return
    }

    try {
      const db = getFirestore()
      
      // Create learning data document
      const learningData = {
        fullName: formData.fullName,
        email: formData.email,
        country: formData.country,
        phoneNumber: formData.phoneNumber,
        price: selectedPaymentType === 'monthly' ? monthlyPrice : oneTimePrice,
        paymentType: selectedPaymentType,
        status: 'pending',
        requestedAt: Timestamp.now(),
        paymentLink: selectedPaymentType === 'monthly' ? monthlyPaymentLink : oneTimePaymentLink
      }

      // Store learning request in a separate collection
      await addDoc(collection(db, 'learningRequests'), {
        userId: user.uid,
        ...learningData
      })

      // Also update user document with learning data
      await updateDoc(doc(db, 'users', user.uid), {
        learningData: learningData
      })

      setSuccess('Your learning access request has been submitted successfully! Please proceed to payment to activate your access.')
      
      // Notify parent component to update user status
      if (onStatusUpdate) {
        onStatusUpdate()
      }

      // Don't close form - show payment section instead
    } catch (error) {
      console.error('Error submitting learning request:', error)
      setError('Failed to submit learning request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleContinueToPayment = (paymentType) => {
    setShowUnderConstruction(true)
  }

  const closeUnderConstruction = () => {
    setShowUnderConstruction(false)
  }

  const getSubModulesForModule = (moduleId) => {
    const module = modulesState.find(m => m.id === moduleId)
    if (module && module.subModules) {
      return module.subModules.map(subModule => ({
        id: subModule.id,
        title: subModule.title,
        subtext: subModule.subtext || '',
        completed: false,
        moduleId: moduleId,
        content: subModule.content || {}
      }))
    }
    return []
  }

  const handleModuleClick = (moduleId) => {
    const module = modulesState.find(m => m.id === moduleId)
    if (module) {
      setSelectedModule(module)
      const moduleSubModules = getSubModulesForModule(moduleId)
      setSubModules(moduleSubModules)
      setCurrentView('sub-modules')
    }
  }

  const handleSubModuleClick = async (subModuleId) => {
    const subModule = subModules.find(sm => sm.id === subModuleId)
    if (subModule && selectedModule) {
      setSelectedSubModule(subModule)
      setCurrentView('content')
      
      // Mark sub-module as completed when clicked
      await markSubModuleCompleted(selectedModule.id, subModuleId)
    }
  }

  const markSubModuleCompleted = async (moduleId, subModuleId) => {
    try {
      const db = getFirestore()
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const learningData = userData.learningData || {}
        const modulesData = learningData.modules || {}
        const moduleData = modulesData[moduleId] || {}
        const completedSubModules = moduleData.completedSubModules || []
        
        // Check if already completed
        if (completedSubModules.includes(subModuleId)) {
          return // Already completed
        }
        
        // Add sub-module to completed list
        const updatedCompletedSubModules = [...completedSubModules, subModuleId]
        
        // Get the module to check total sub-modules
        const module = modulesState.find(m => m.id === moduleId)
        const totalSubModules = module?.subModules?.length || 0
        
        // Check if all sub-modules are completed
        const allSubModulesCompleted = updatedCompletedSubModules.length === totalSubModules
        
        // Update module data
        const updatedModulesData = {
          ...modulesData,
          [moduleId]: {
            ...moduleData,
            completedSubModules: updatedCompletedSubModules
          }
        }
        
        // Update completed modules list if all sub-modules are done
        let updatedCompletedModules = learningData.completedModules || []
        if (allSubModulesCompleted && !updatedCompletedModules.includes(moduleId)) {
          updatedCompletedModules = [...updatedCompletedModules, moduleId]
        } else if (!allSubModulesCompleted && updatedCompletedModules.includes(moduleId)) {
          // Remove from completed if not all sub-modules are done
          updatedCompletedModules = updatedCompletedModules.filter(id => id !== moduleId)
        }
        
        // Update Firestore
        await updateDoc(userDocRef, {
          learningData: {
            ...learningData,
            modules: updatedModulesData,
            completedModules: updatedCompletedModules
          }
        })
        
        // Reload progress to update UI
        await loadLearningProgress()
        
        // Update selectedModule if it's the current one
        if (selectedModule && selectedModule.id === moduleId) {
          const updatedModule = modulesState.find(m => m.id === moduleId)
          if (updatedModule) {
            setSelectedModule(updatedModule)
          }
        }
      }
    } catch (error) {
      console.error('Error marking sub-module as completed:', error)
    }
  }

  const handleBack = () => {
    if (currentView === 'content') {
      setCurrentView('sub-modules')
      setSelectedSubModule(null)
    } else if (currentView === 'sub-modules') {
      setCurrentView('main')
      setSelectedModule(null)
      setSubModules([])
    }
  }

  if (loading) {
    return (
      <div className="learning-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  // User is already a learner - show learning content
  if (isLearner) {
    return (
      <div className="learning-container">
        {/* Back Button */}
        {(currentView === 'sub-modules' || currentView === 'content') && (
          <button className="back-button-top" onClick={handleBack}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        <h1 className="learning-title">
          {currentView === 'sub-modules' ? selectedModule?.title : 
           currentView === 'content' ? selectedSubModule?.title : 
           'Learning Center'}
        </h1>
        
        {/* Progress Bar Section - Only show on main view */}
        {currentView === 'main' && (
          <div className="progress-section">
            <div className="progress-header">
              <h2>Your Learning Progress</h2>
              <span className="progress-percentage">{Math.round(learningProgress)}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${learningProgress}%` }}
                ></div>
              </div>
              <div className="progress-labels">
                <span className="progress-label">Beginner</span>
                <span className="progress-label">Expert</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Modules View */}
        {currentView === 'main' && (
          <div className="modules-section">
            <h2 className="modules-title">Learning Modules</h2>
            <div className="modules-grid">
              {modulesState.map((module, index) => (
                <div
                  key={module.id}
                  className={`module-card ${module.completed ? 'completed' : ''}`}
                  onClick={() => handleModuleClick(module.id)}
                >
                  <div className="module-number">{index + 1}</div>
                  <div className="module-content">
                    <div className="module-text-content">
                      <h3 className="module-title">{module.title}</h3>
                      {module.subtext && (
                        <p className="module-subtext">{module.subtext}</p>
                      )}
                    </div>
                  </div>
                  <div className="module-arrow">›</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-Modules View */}
        {currentView === 'sub-modules' && selectedModule && (
          <div className="modules-section">
            <h2 className="modules-title">Sub-Modules</h2>
            {subModules.length === 0 ? (
              <p className="no-submodules">No sub-modules available yet. Please contact an administrator.</p>
            ) : (
              <div className="modules-grid">
                {subModules.map((subModule, index) => {
                  // Check if sub-module is completed from the selected module's data
                  const isCompleted = selectedModule?.completedSubModules?.includes(subModule.id) || false
                  
                  return (
                    <div
                      key={subModule.id}
                      className={`module-card ${isCompleted ? 'completed' : ''}`}
                      onClick={() => handleSubModuleClick(subModule.id)}
                    >
                      <div className="module-number">{index + 1}</div>
                      <div className="module-content">
                        <div className="module-text-content">
                          <h3 className="module-title">{subModule.title}</h3>
                          {subModule.subtext && (
                            <p className="module-subtext">{subModule.subtext}</p>
                          )}
                        </div>
                      </div>
                      <div className="module-arrow">›</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Content View */}
        {currentView === 'content' && selectedSubModule && (
          <div className="content-section">
            <div className="content-widget">
              <h2>{selectedSubModule.title}</h2>
              {selectedSubModule.content?.pdfUrl ? (
                <div className="pdf-viewer-container">
                  <iframe
                    src={`${selectedSubModule.content.pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="pdf-viewer"
                    title="PDF Viewer"
                  />
                </div>
              ) : (
                <p>Content for this sub-module will be displayed here.</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // User has pending request
  if (isPending) {
    return (
      <div className="learning-container">
        <div className="learning-widget">
          <h2>Learning Access Request Submitted</h2>
          <p>Your request for learning access is being reviewed. Once approved, you'll be able to access all learning materials.</p>
          <p>You will receive a confirmation email shortly.</p>
        </div>
      </div>
    )
  }

  // User needs to request learning access
  return (
    <div className="learning-container">
      {!showForm ? (
        <div className="learning-widget">
          <div className="learning-intro">
            <h2>Start Your Learning Journey</h2>
            <p className="learning-description">
              Here you will be able to learn technicals, indicators and how to operate in the market in a step-by-step procedure from beginner to expert.
            </p>
            
            <div className="learning-features">
              <h3>What You'll Learn:</h3>
              <ul className="features-list">
                <li>Technical analysis fundamentals</li>
                <li>Market indicators and their applications</li>
                <li>Trading strategies from beginner to advanced</li>
                <li>Risk management techniques</li>
                <li>Real-world market operation procedures</li>
                <li>Step-by-step guidance at every level</li>
              </ul>
            </div>

            <div className="learning-pricing">
              <div className="pricing-options">
                <div 
                  className="pricing-option"
                  onClick={() => handleContinueToPayment('monthly')}
                >
                  <div className="pricing-option-content">
                    <span className="pricing-option-label">Monthly Payment</span>
                    <span className="pricing-option-amount">€{monthlyPrice}</span>
                    <span className="pricing-option-period">per month</span>
                  </div>
                </div>
                <div 
                  className="pricing-option"
                  onClick={() => handleContinueToPayment('one-time')}
                >
                  <div className="pricing-option-content">
                    <span className="pricing-option-label">One-time Payment</span>
                    <span className="pricing-option-amount">€{oneTimePrice}</span>
                    <span className="pricing-option-period">one-time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="learning-widget">
          <h2>Request Learning Access</h2>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit} className="learning-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                disabled
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country *</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                placeholder="Enter your country"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
                placeholder="Enter your phone number"
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Back
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>

          {success && selectedPaymentType && (
            <div className="payment-section">
              <div className="payment-info">
                <h3>Continue to Payment</h3>
                <p>Click the button below to complete your payment and activate your learning access:</p>
                <button 
                  className="btn btn-primary btn-payment"
                  onClick={() => {
                    setShowUnderConstruction(true)
                  }}
                >
                  Continue to Payment (€{selectedPaymentType === 'monthly' ? monthlyPrice : oneTimePrice})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Under Construction Modal */}
      {showUnderConstruction && (
        <div className="under-construction-overlay" onClick={closeUnderConstruction}>
          <div className="under-construction-modal" onClick={(e) => e.stopPropagation()}>
            <button className="under-construction-close" onClick={closeUnderConstruction}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className="under-construction-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            
            <h2 className="under-construction-title">Under Construction</h2>
            <p className="under-construction-message">Currently it's under construction.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Learning

