import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, Timestamp, getDocs, getDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'
import { sendConsultationLinkEmail } from '../firebase/email'
import './AdminSupport.css'

const AdminSupport = () => {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userMessages, setUserMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessage, setLoadingMessage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [unreadUsers, setUnreadUsers] = useState(new Set())
  const [consultations, setConsultations] = useState([])
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [googleMeetLink, setGoogleMeetLink] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // all, pending, completed
  const [userTypeFilter, setUserTypeFilter] = useState('all') // all, investor, learner, relations, admin
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    loadUsers()
    loadConsultations()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadUserMessages(selectedUser.uid)
      markMessagesAsRead(selectedUser.uid)
      // Immediately remove unread indicator when user is selected
      setUnreadUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedUser.uid)
        return newSet
      })
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === selectedUser.uid 
            ? { ...user, hasUnreadMessages: false }
            : user
        )
      )
    }
  }, [selectedUser])

  useEffect(() => {
    // Scroll to bottom when messages are updated
    if (userMessages.length > 0) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [userMessages])

  const loadUsers = async () => {
    try {
      const db = getFirestore()
      const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'))
      
      const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
        const usersList = []
        const newUnreadUsers = new Set()
        
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data()
          
          // Check for unread messages (messages with status 'pending' that haven't been read by admin)
          let hasUnreadMessages = false
          try {
            const messagesQuery = query(
              collection(db, 'supportMessages'),
              where('userId', '==', userDoc.id),
              where('status', '==', 'pending')
            )
            const messagesSnapshot = await getDocs(messagesQuery)
            hasUnreadMessages = !messagesSnapshot.empty
          } catch (error) {
            console.error('Error checking unread messages:', error)
          }

          usersList.push({
            uid: userDoc.id,
            ...userData,
            hasUnreadMessages
          })
          
          // Track unread users
          if (hasUnreadMessages) {
            newUnreadUsers.add(userDoc.id)
          }
        }
        
        setUsers(usersList)
        setUnreadUsers(newUnreadUsers)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }
  
  // Listen for new messages to update unread status
  useEffect(() => {
    const db = getFirestore()
    // Remove orderBy to avoid composite index requirement
    const messagesQuery = query(
      collection(db, 'supportMessages'),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        const messageData = doc.data()
        if (messageData.userId && messageData.status === 'pending') {
          setUnreadUsers(prev => new Set(prev).add(messageData.userId))
          // Update user in users list
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.uid === messageData.userId 
                ? { ...user, hasUnreadMessages: true }
                : user
            )
          )
        }
      })
    }, (error) => {
      console.error('Error listening to messages:', error)
    })

    return () => unsubscribe()
  }, [])

  const loadUserMessages = (userId) => {
    const db = getFirestore()
    // Remove orderBy to avoid composite index requirement - we'll sort in memory
    const messagesQuery = query(
      collection(db, 'supportMessages'),
      where('userId', '==', userId)
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
      setUserMessages(messages)
      
      // Scroll to bottom when messages are loaded
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }, (error) => {
      console.error('Error loading messages:', error)
    })

    return unsubscribe
  }

  const markMessagesAsRead = async (userId) => {
    try {
      const db = getFirestore()
      // Find all pending messages for this user
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      )
      const messagesSnapshot = await getDocs(messagesQuery)
      
      // Update all pending messages to 'read'
      const updatePromises = []
      messagesSnapshot.forEach((doc) => {
        updatePromises.push(updateDoc(doc.ref, {
          status: 'read'
        }))
      })
      
      await Promise.all(updatePromises)
      
      // Remove from unread users set immediately
      setUnreadUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      
      // Update users list to remove unread indicator immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userId 
            ? { ...user, hasUnreadMessages: false }
            : user
        )
      )
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const getFirstName = (fullName) => {
    if (!fullName) return ''
    return fullName.split(' ')[0]
  }

  const loadConsultations = () => {
    const db = getFirestore()
    // Remove orderBy to avoid composite index requirement - we'll sort in memory
    const consultationsQuery = query(
      collection(db, 'supportRequests'),
      where('type', '==', 'consultation')
    )

    const unsubscribe = onSnapshot(consultationsQuery, async (snapshot) => {
      const consultationsList = []
      for (const consultationDoc of snapshot.docs) {
        const consultationData = consultationDoc.data()
        
        // Get user statuses (only if userId exists)
        let userStatuses = []
        if (consultationData.userId) {
          try {
            const userDocRef = doc(db, 'users', consultationData.userId)
            const userDocSnap = await getDoc(userDocRef)
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data()
              userStatuses = userData.statuses || []
            }
          } catch (error) {
            console.error('Error loading user data:', error)
          }
        }

        consultationsList.push({
          id: consultationDoc.id,
          ...consultationData,
          userStatuses
        })
      }
      // Sort by createdAt in memory (descending)
      consultationsList.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return bTime - aTime
      })
      setConsultations(consultationsList)
    }, (error) => {
      console.error('Error loading consultations:', error)
    })

    return unsubscribe
  }

  const handleUploadFile = async (file, isImage = false) => {
    if (!file) return null

    setUploadingFile(true)
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_')
      const folder = isImage ? 'support-images' : 'support-files'
      const fileRef = ref(storage, `${folder}/${selectedUser.uid}/${Date.now()}_${sanitizedName}`)
      
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      
      return downloadURL
    } catch (error) {
      console.error('Error uploading file:', error)
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSendMessage = async (attachedFile = null, attachedImage = null) => {
    if ((!newMessage.trim() && !attachedFile && !attachedImage) || !selectedUser) {
      return
    }

    setLoadingMessage(true)
    setUploadingFile(true)
    try {
      const db = getFirestore()
      
      // Upload file/image if provided
      let fileUrl = null
      let imageUrl = null
      let fileName = null
      
      if (attachedFile) {
        fileUrl = await handleUploadFile(attachedFile, false)
        fileName = attachedFile.name
        if (!fileUrl) {
          setLoadingMessage(false)
          setUploadingFile(false)
          return
        }
      }
      
      if (attachedImage) {
        imageUrl = await handleUploadFile(attachedImage, true)
        if (!imageUrl) {
          setLoadingMessage(false)
          setUploadingFile(false)
          return
        }
      }
      
      setUploadingFile(false)
      
      // Create a new message document for each admin response
      // This ensures all messages are preserved and displayed correctly
      const adminResponseData = {
        message: newMessage.trim() || '',
        createdAt: Timestamp.now()
      }
      
      if (fileUrl) {
        adminResponseData.fileUrl = fileUrl
        adminResponseData.fileName = fileName
      }
      
      if (imageUrl) {
        adminResponseData.imageUrl = imageUrl
      }
      
      // Create a new message document with only admin response (no user message fields)
      // This prevents showing empty user messages
      await addDoc(collection(db, 'supportMessages'), {
        userId: selectedUser.uid,
        userName: selectedUser.displayName || selectedUser.email,
        userEmail: selectedUser.email,
        status: 'responded',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        type: 'chat',
        adminResponse: adminResponseData
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      setUploadingFile(false)
    } finally {
      setLoadingMessage(false)
    }
  }

  const handleSendConsultationLink = async () => {
    if (!googleMeetLink.trim() || !selectedConsultation) {
      return
    }

    setLoadingEmail(true)
    try {
      const result = await sendConsultationLinkEmail(
        selectedConsultation.userEmail,
        selectedConsultation.userName,
        selectedConsultation.date,
        selectedConsultation.time,
        googleMeetLink
      )

      if (result.success) {
        // Update consultation status to completed
        const db = getFirestore()
        await updateDoc(doc(db, 'supportRequests', selectedConsultation.id), {
          status: 'completed',
          googleMeetLink: googleMeetLink.trim(),
          linkSentAt: Timestamp.now()
        })

        setSelectedConsultation(null)
        setGoogleMeetLink('')
        // Success - modal closes automatically, no alert popup
      } else {
        // Only show error alert if sending fails
        alert('Failed to send email: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error sending consultation link:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setLoadingEmail(false)
    }
  }

  const getUserStatusLabel = (statuses) => {
    if (!statuses || statuses.length === 0) return 'User'
    if (statuses.includes('Admin')) return 'Admin'
    if (statuses.includes('Investor')) return 'Investor'
    if (statuses.includes('Learner')) return 'Learner'
    if (statuses.includes('Relations')) return 'Relations'
    return 'User'
  }

  const filteredConsultations = consultations.filter(consultation => {
    const statusMatch = statusFilter === 'all' || consultation.status === statusFilter
    const userTypeMatch = userTypeFilter === 'all' || 
      (userTypeFilter === 'investor' && consultation.userStatuses?.includes('Investor')) ||
      (userTypeFilter === 'learner' && consultation.userStatuses?.includes('Learner')) ||
      (userTypeFilter === 'relations' && consultation.userStatuses?.includes('Relations')) ||
      (userTypeFilter === 'admin' && consultation.userStatuses?.includes('Admin')) ||
      (userTypeFilter === 'user' && (!consultation.userStatuses || consultation.userStatuses.length === 0 || 
        (!consultation.userStatuses.includes('Investor') && !consultation.userStatuses.includes('Learner') && 
         !consultation.userStatuses.includes('Relations') && !consultation.userStatuses.includes('Admin'))))
    return statusMatch && userTypeMatch
  })

  return (
    <div className="admin-support-container">
      <div className="admin-support-layout">
        {/* Left Sidebar - Users List */}
        <div className="users-sidebar">
          <h3 className="sidebar-title">Users</h3>
          <div className="users-list">
            {users.map((user) => (
              <button
                key={user.uid}
                className={`user-item ${selectedUser?.uid === user.uid ? 'active' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || user.email} />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="user-name">{getFirstName(user.displayName || user.email)}</p>
                {(user.hasUnreadMessages || unreadUsers.has(user.uid)) && (
                  <div className="unread-notification">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Section - Chat */}
        <div className="chat-section">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <h3>{selectedUser.displayName || selectedUser.email}</h3>
                <p className="user-status">{getUserStatusLabel(selectedUser.statuses)}</p>
              </div>
              <div className="chat-messages">
                {userMessages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  userMessages.map((msg) => (
                    <div key={msg.id} className="message-thread">
                      {(msg.message || msg.imageUrl || msg.fileUrl) && (
                        <div className="message-item user-message">
                          <div className="message-header">
                            <span className="message-author">{msg.userName}</span>
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
                        </div>
                      )}
                      {msg.adminResponse && (msg.adminResponse.message || msg.adminResponse.imageUrl || msg.adminResponse.fileUrl) && (
                        <div className="message-item admin-message">
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
                  placeholder="Type your response..."
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
                    disabled={uploadingFile || loadingMessage || !selectedUser}
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
                    disabled={uploadingFile || loadingMessage || !selectedUser}
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
                    disabled={loadingMessage || uploadingFile || (!newMessage.trim() && !uploadingFile) || !selectedUser}
                  >
                    {loadingMessage || uploadingFile ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a user to view messages</p>
            </div>
          )}
        </div>

        {/* Right Section - Pending Consultations */}
        <div className="consultations-section">
          <h3 className="section-title">Pending Consultations</h3>
          
          {/* Filters */}
          <div className="filters">
            <div className="filter-group">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>User Type:</label>
              <select value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="investor">Investor</option>
                <option value="learner">Learner</option>
                <option value="relations">Relations</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          {/* Consultations List */}
          <div className="consultations-list">
            {filteredConsultations.length === 0 ? (
              <div className="no-consultations">
                <p>No consultations found.</p>
              </div>
            ) : (
              filteredConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className={`consultation-item ${consultation.status}`}
                  onClick={() => setSelectedConsultation(consultation)}
                >
                  <div className="consultation-header">
                    <h4>{consultation.userName}</h4>
                    <span className={`status-badge ${consultation.status}`}>
                      {consultation.status}
                    </span>
                  </div>
                  <p className="consultation-email">{consultation.userEmail}</p>
                  <p className="consultation-date">
                    {consultation.date?.toDate ? 
                      consultation.date.toDate().toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 
                      'Date not set'
                    } at {consultation.time || 'Time not set'}
                  </p>
                  <p className="consultation-user-type">
                    {getUserStatusLabel(consultation.userStatuses)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Consultation Link Modal */}
      {selectedConsultation && (
        <div className="modal-backdrop" onClick={() => setSelectedConsultation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Google Meet Link</h3>
              <button className="modal-close" onClick={() => setSelectedConsultation(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>User:</strong> {selectedConsultation.userName}</p>
              <p><strong>Email:</strong> {selectedConsultation.userEmail}</p>
              {selectedConsultation.company && (
                <p><strong>Company:</strong> {selectedConsultation.company}</p>
              )}
              <p><strong>Date:</strong> {
                selectedConsultation.date?.toDate ? 
                  selectedConsultation.date.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 
                  'Date not set'
              }</p>
              <p><strong>Time:</strong> {selectedConsultation.time || 'Time not set'}</p>
              {selectedConsultation.message && (
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <p><strong>Meeting Details:</strong></p>
                  <p style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {selectedConsultation.message}
                  </p>
                </div>
              )}
              
              <div className="form-field">
                <label>Google Meet Link *</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://meet.google.com/..."
                  value={googleMeetLink}
                  onChange={(e) => setGoogleMeetLink(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedConsultation(null)
                  setGoogleMeetLink('')
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendConsultationLink}
                disabled={loadingEmail || !googleMeetLink.trim()}
              >
                {loadingEmail ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSupport

