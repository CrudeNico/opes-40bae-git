import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '../firebase/config'
import './Support.css'

const Support = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [consultationFormData, setConsultationFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingConsultation, setLoadingConsultation] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  useEffect(() => {
    if (user) {
      // Pre-fill form with user data
      setConsultationFormData(prev => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || ''
      }))

      // Load chat messages for this user
      const unsubscribe = loadChatMessages()
      
      return () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    }
  }, [user])

  const loadChatMessages = () => {
    if (!user) return

    const db = getFirestore()
    // Remove orderBy to avoid composite index requirement - we'll sort in memory
    const messagesQuery = query(
      collection(db, 'supportMessages'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = []
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        })
      })
      // Sort by createdAt in memory
      messages.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return aTime - bTime
      })
      setChatMessages(messages)
    }, (error) => {
      console.error('Error loading messages:', error)
    })

    return unsubscribe
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

  const handleScheduleConsultation = async () => {
    if (!selectedDate || !selectedTime || !consultationFormData.name || !consultationFormData.email) {
      setError('Please fill in all required fields and select a date and time.')
      return
    }

    setLoadingConsultation(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      const consultationData = {
        userId: user.uid,
        userName: consultationFormData.name,
        userEmail: consultationFormData.email,
        company: consultationFormData.company || '',
        date: Timestamp.fromDate(selectedDate),
        time: selectedTime,
        message: consultationFormData.message || '',
        status: 'pending',
        createdAt: Timestamp.now(),
        type: 'consultation'
      }

      await addDoc(collection(db, 'supportRequests'), consultationData)

      setSuccess('Consultation request submitted successfully! You will receive a confirmation email shortly.')
      setSelectedDate(null)
      setSelectedTime('')
      setConsultationFormData({
        name: user.displayName || '',
        email: user.email || '',
        company: '',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting consultation:', error)
      setError('Failed to submit consultation request. Please try again.')
    } finally {
      setLoadingConsultation(false)
    }
  }

  const handleUploadFile = async (file, isImage = false) => {
    if (!file) return null

    setUploadingFile(true)
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_')
      const folder = isImage ? 'support-images' : 'support-files'
      const fileRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${sanitizedName}`)
      
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      
      return downloadURL
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload file. Please try again.')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSendMessage = async (attachedFile = null, attachedImage = null) => {
    if (!newMessage.trim() && !attachedFile && !attachedImage) {
      setError('Please enter a message or attach a file.')
      return
    }

    setLoadingMessage(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      
      // Upload file/image if provided
      let fileUrl = null
      let imageUrl = null
      
      if (attachedFile) {
        fileUrl = await handleUploadFile(attachedFile, false)
        if (!fileUrl) {
          setLoadingMessage(false)
          return
        }
      }
      
      if (attachedImage) {
        imageUrl = await handleUploadFile(attachedImage, true)
        if (!imageUrl) {
          setLoadingMessage(false)
          return
        }
      }

      const messageData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        message: newMessage.trim() || '',
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        type: 'chat',
        ...(fileUrl && { fileUrl, fileName: attachedFile.name }),
        ...(imageUrl && { imageUrl })
      }

      await addDoc(collection(db, 'supportMessages'), messageData)

      setNewMessage('')
      setSuccess('Message sent successfully! An admin will respond shortly.')
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setLoadingMessage(false)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  const days = []

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

  return (
    <div className="support-container">
      <div className="support-content">
        <h2 className="support-title">Support Center</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="support-layout">
          {/* Calendar Consultation Section */}
          <div className="consultation-section">
            {!selectedDate ? (
              <div className="calendar-container">
                <div className="calendar-section">
                    <div className="calendar-widget">
                      <div className="calendar-header">
                        <button className="calendar-nav" onClick={handlePrevMonth}>‹</button>
                        <h4 className="calendar-month">{monthNames[currentMonth]} {currentYear}</h4>
                        <button className="calendar-nav" onClick={handleNextMonth}>›</button>
                      </div>
                      <div className="calendar-grid">
                        <div className="calendar-weekdays">
                          {weekdays.map((day) => (
                            <div key={day} className="calendar-weekday">{day}</div>
                          ))}
                        </div>
                        <div className="calendar-days">
                          {days.map((dayData, index) => {
                            if (dayData === null) {
                              return <div key={index} className="calendar-day empty"></div>
                            }
                            return (
                              <button
                                key={index}
                                className={`calendar-day ${dayData.isAvailable ? 'available' : 'unavailable'}`}
                                onClick={() => dayData.isAvailable && setSelectedDate(dayData.date)}
                                disabled={!dayData.isAvailable}
                              >
                                {dayData.day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                        </div>
                      </div>
                    </div>
                ) : (
              <div className="calendar-widget consultation-form">
                <div className="form-header">
                  <button className="back-button" onClick={() => setSelectedDate(null)}>← Back</button>
                  <h3 className="form-title">Schedule Your Consultation</h3>
                  <p className="selected-date">Selected: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                
                <div className="form-content-vertical">
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

                  <div className="form-field">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your name"
                      value={consultationFormData.name}
                      onChange={(e) => setConsultationFormData({...consultationFormData, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Company (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your company name"
                      value={consultationFormData.company}
                      onChange={(e) => setConsultationFormData({...consultationFormData, company: e.target.value})}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter your email"
                      value={consultationFormData.email}
                      onChange={(e) => setConsultationFormData({...consultationFormData, email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Meeting Details (Optional)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Tell us about what you'd like to discuss..."
                      rows="4"
                      value={consultationFormData.message}
                      onChange={(e) => setConsultationFormData({...consultationFormData, message: e.target.value})}
                    />
                  </div>

                  <button 
                    className="btn btn-primary submit-button" 
                    onClick={handleScheduleConsultation}
                    disabled={loadingConsultation || !selectedTime}
                  >
                    {loadingConsultation ? 'Submitting...' : 'Schedule Consultation'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Second Widget Section */}
          <div className="chat-section">
            <div className="chat-widget">
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start a conversation with our support team!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="message-item">
                      {/* Only show user message if there's actual content (message, image, or file) */}
                      {(msg.message || msg.imageUrl || msg.fileUrl) && (
                        <>
                          <div className="message-header">
                            <span className="message-author">You</span>
                            <span className="message-date">
                              {msg.createdAt?.toDate ? 
                                msg.createdAt.toDate().toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                'Just now'
                              }
                            </span>
                          </div>
                          <div className="message-content">
                            {msg.message && <p>{msg.message}</p>}
                            {msg.imageUrl && (
                              <div className="message-attachment">
                                <img src={msg.imageUrl} alt="Uploaded image" className="message-image" />
                              </div>
                            )}
                            {msg.fileUrl && (
                              <div className="message-attachment">
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">
                                  📎 {msg.fileName || 'Download file'}
                                </a>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {msg.adminResponse && (
                        <div className="admin-response">
                          <div className="message-header">
                            <span className="message-author admin">Admin</span>
                            <span className="message-date">
                              {msg.adminResponse.createdAt?.toDate ? 
                                msg.adminResponse.createdAt.toDate().toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                'Just now'
                              }
                            </span>
                          </div>
                          <div className="message-content">
                            {msg.adminResponse.message && <p>{msg.adminResponse.message}</p>}
                            {msg.adminResponse.imageUrl && (
                              <div className="message-attachment">
                                <img src={msg.adminResponse.imageUrl} alt="Uploaded image" className="message-image" />
                              </div>
                            )}
                            {msg.adminResponse.fileUrl && (
                              <div className="message-attachment">
                                <a href={msg.adminResponse.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">
                                  📎 {msg.adminResponse.fileName || 'Download file'}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-container">
                <textarea
                  className="chat-input"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (newMessage.trim() && !loadingMessage) {
                        handleSendMessage()
                      }
                    }
                  }}
                  rows="3"
                />
                <div className="chat-actions">
                  <button 
                    className="chat-attachment-button"
                    type="button"
                    title="Add image"
                    aria-label="Add image"
                    disabled={uploadingFile || loadingMessage}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async (e) => {
                        const file = e.target.files[0]
                        if (file) {
                          await handleSendMessage(null, file)
                        }
                      }
                      input.click()
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </button>
                  <button 
                    className="chat-attachment-button"
                    type="button"
                    title="Add file"
                    aria-label="Add file"
                    disabled={uploadingFile || loadingMessage}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.onchange = async (e) => {
                        const file = e.target.files[0]
                        if (file) {
                          await handleSendMessage(file, null)
                        }
                      }
                      input.click()
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                  </button>
                  <button 
                    className="btn btn-primary send-button"
                    onClick={() => handleSendMessage()}
                    disabled={loadingMessage || uploadingFile || (!newMessage.trim() && !uploadingFile)}
                  >
                    {loadingMessage || uploadingFile ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Support

