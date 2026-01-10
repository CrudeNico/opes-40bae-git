import React, { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore'
import CommunityContent from './CommunityContent'
import './Learning.css'

const Community = ({ user, onStatusUpdate }) => {
  const [isCommunityMember, setIsCommunityMember] = useState(false)
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
  const [showUnderConstruction, setShowUnderConstruction] = useState(false)

  const monthlyPrice = 20 // Monthly price in EUR
  const annualPrice = 199 // Annual price in EUR
  const monthlyPaymentLink = 'https://stripe.opessocius.com/community-monthly' // Placeholder Stripe link
  const annualPaymentLink = 'https://stripe.opessocius.com/community-annual' // Placeholder Stripe link

  const handleContinueToPayment = (paymentType) => {
    setShowUnderConstruction(true)
  }

  const closeUnderConstruction = () => {
    setShowUnderConstruction(false)
  }

  useEffect(() => {
    checkCommunityStatus()
  }, [user])

  const checkCommunityStatus = async () => {
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
        
        setIsCommunityMember(statuses.includes('Community'))
        // Check if community access is pending
        setIsPending(userData.communityData && userData.communityData.status === 'pending')
      }
    } catch (error) {
      console.error('Error checking community status:', error)
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
      
      // Create community data document
      const communityData = {
        fullName: formData.fullName,
        email: formData.email,
        country: formData.country,
        phoneNumber: formData.phoneNumber,
        price: selectedPaymentType === 'monthly' ? monthlyPrice : annualPrice,
        paymentType: selectedPaymentType,
        status: 'pending',
        requestedAt: Timestamp.now(),
        paymentLink: selectedPaymentType === 'monthly' ? monthlyPaymentLink : annualPaymentLink
      }

      // Store community request in a separate collection
      await addDoc(collection(db, 'communityRequests'), {
        userId: user.uid,
        ...communityData
      })

      // Also update user document with community data
      await updateDoc(doc(db, 'users', user.uid), {
        communityData: communityData
      })

      setSuccess('Your community access request has been submitted successfully!')
      
      // Notify parent component to update user status
      if (onStatusUpdate) {
        onStatusUpdate()
      }
      
      // Don't close form - show payment section instead
    } catch (error) {
      console.error('Error submitting community request:', error)
      setError('Failed to submit community request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="learning-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  // User is already a community member - show community content
  if (isCommunityMember) {
    return <CommunityContent user={user} />
  }

  // User has pending request
  if (isPending) {
    return (
      <div className="learning-container">
        <div className="learning-widget">
          <h2>Community Access Request Submitted</h2>
          <p>Your request for community access is being reviewed. Once approved, you'll be able to access all community features.</p>
          <p>You will receive a confirmation email shortly.</p>
        </div>
      </div>
    )
  }

  // User needs to request access
  return (
    <div className="learning-container">
      {!showForm ? (
        <div className="learning-widget">
          <div className="learning-intro">
            <h2>Join Our Community</h2>
            <p className="learning-description">
              Connect with other investors, share insights, and learn from experienced traders in our exclusive community.
            </p>
            
            <div className="learning-features">
              <h3>What You'll Learn:</h3>
              <ul className="features-list">
                <li>Private Investor Network</li>
                <li>Live Market Discussions</li>
                <li>Weekly Market Analysis</li>
                <li>Real-Time Market Alerts</li>
                <li>Team Feedback</li>
                <li>Exclusive video Updates</li>
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
                  onClick={() => handleContinueToPayment('annual')}
                >
                  <div className="pricing-option-content">
                    <span className="pricing-option-label">Annual Payment</span>
                    <span className="pricing-option-amount">€{annualPrice}</span>
                    <span className="pricing-option-period">per year</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="learning-widget">
          <h2>Request Community Access</h2>
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
                <p>Click the button below to complete your payment and activate your community access:</p>
                <button 
                  className="btn btn-primary btn-payment"
                  onClick={() => {
                    setShowUnderConstruction(true)
                  }}
                >
                  Continue to Payment (€{selectedPaymentType === 'monthly' ? monthlyPrice : annualPrice})
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

export default Community

