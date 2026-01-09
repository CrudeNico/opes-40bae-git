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

  const monthlyPrice = 20 // Monthly price in EUR
  const annualPrice = 199 // Annual price in EUR
  const monthlyPaymentLink = 'https://stripe.opessocius.com/community-monthly' // Placeholder Stripe link
  const annualPaymentLink = 'https://stripe.opessocius.com/community-annual' // Placeholder Stripe link

  const handleContinueToPayment = (paymentType) => {
    setSelectedPaymentType(paymentType)
    setShowForm(true)
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
                    const link = selectedPaymentType === 'monthly' ? monthlyPaymentLink : annualPaymentLink
                    window.open(link, '_blank')
                  }}
                >
                  Continue to Payment (€{selectedPaymentType === 'monthly' ? monthlyPrice : annualPrice})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Community

