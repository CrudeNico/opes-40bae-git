import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, onSnapshot, deleteDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import './CommunityContent.css'

const CommunityContent = ({ user }) => {
  const [tradeAlerts, setTradeAlerts] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [weeklyReports, setWeeklyReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [fileAttachment, setFileAttachment] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadTradeAlerts()
    loadWeeklyReports()
    setupChatListener()
    
    // Cleanup old messages on mount
    cleanupOldMessages()
    
    // Set up periodic cleanup (every hour)
    const cleanupInterval = setInterval(() => {
      cleanupOldMessages()
    }, 60 * 60 * 1000) // 1 hour
    
    return () => clearInterval(cleanupInterval)
  }, [])


  const scrollToBottom = () => {
    // Only scroll the chat messages container, not the page
    if (messagesEndRef.current) {
      const chatMessagesContainer = messagesEndRef.current.closest('.chat-messages')
      if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight
      }
    }
  }

  const getFirstName = (name) => {
    if (!name) return 'User'
    return name.split(' ')[0]
  }

  const loadTradeAlerts = async () => {
    try {
      const db = getFirestore()
      const alertsQuery = query(
        collection(db, 'tradeAlerts'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(alertsQuery)
      const alerts = []
      snapshot.forEach((doc) => {
        alerts.push({ id: doc.id, ...doc.data() })
      })
      setTradeAlerts(alerts)
    } catch (error) {
      console.error('Error loading trade alerts:', error)
    }
  }

  const setupChatListener = () => {
    const db = getFirestore()
    const messagesQuery = query(
      collection(db, 'communityMessages'),
      orderBy('createdAt', 'asc')
    )

    let isInitialLoad = true
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = []
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() })
      })
      const previousMessageCount = chatMessages.length
      setChatMessages(messages)
      setLoading(false)
      
      // On initial load, scroll chat to bottom (but don't scroll the page)
      if (isInitialLoad && messages.length > 0) {
        setTimeout(() => {
          scrollToBottom()
        }, 200)
        isInitialLoad = false
      }
      // Also scroll if a new message was added after initial load
      else if (!isInitialLoad && messages.length > previousMessageCount && previousMessageCount > 0) {
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      }
    })

    return () => unsubscribe()
  }

  const cleanupOldMessages = async () => {
    try {
      const db = getFirestore()
      const oneWeekAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      
      const messagesQuery = query(
        collection(db, 'communityMessages'),
        orderBy('createdAt', 'asc')
      )
      
      const snapshot = await getDocs(messagesQuery)
      const deletePromises = []
      
      snapshot.forEach((doc) => {
        const messageData = doc.data()
        const messageDate = messageData.createdAt
        if (messageDate && messageDate.toMillis && messageDate.toMillis() < oneWeekAgo.toMillis()) {
          deletePromises.push(deleteDoc(doc.ref))
        }
      })
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises)
        console.log(`Cleaned up ${deletePromises.length} old messages`)
      }
    } catch (error) {
      console.error('Error cleaning up old messages:', error)
    }
  }

  const loadWeeklyReports = async () => {
    try {
      const db = getFirestore()
      const reportsQuery = query(
        collection(db, 'weeklyReports'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(reportsQuery)
      const reports = []
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() })
      })
      setWeeklyReports(reports)
    } catch (error) {
      console.error('Error loading weekly reports:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !imageFile && !fileAttachment) return

    setSendingMessage(true)
    try {
      const db = getFirestore()
      const storage = getStorage()
      let imageUrl = null
      let fileUrl = null
      let fileName = null

      // Upload image if present
      if (imageFile) {
        const timestamp = Date.now()
        const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `community-images/${user.uid}/${timestamp}_${sanitizedName}`
        const storageRef = ref(storage, filename)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      // Upload file if present
      if (fileAttachment) {
        const timestamp = Date.now()
        const sanitizedName = fileAttachment.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `community-files/${user.uid}/${timestamp}_${sanitizedName}`
        const storageRef = ref(storage, filename)
        await uploadBytes(storageRef, fileAttachment)
        fileUrl = await getDownloadURL(storageRef)
        fileName = fileAttachment.name
      }

      await addDoc(collection(db, 'communityMessages'), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        message: newMessage.trim() || '',
        imageUrl: imageUrl,
        fileUrl: fileUrl,
        fileName: fileName,
        createdAt: Timestamp.now()
      })

      setNewMessage('')
      setImageFile(null)
      setFileAttachment(null)
      
      // Scroll chat to bottom after sending message
      scrollChatOnNewMessage()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFileAttachment(file)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  return (
    <div className="community-content-container">
      <h1 className="community-content-title">Community</h1>

      {/* Main Content: Trade Alerts and Weekly Reports */}
      <div className="community-main-layout">
        {/* Left: Trade Alerts */}
        <div className="trade-alerts-section">
          <h2 className="section-title">Trade Alerts</h2>
          <div className="trade-alerts-list">
            {tradeAlerts.length === 0 ? (
              <p className="no-items">No trade alerts yet.</p>
            ) : (
              tradeAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="trade-alert-tag">
                  <div className="trade-alert-content">
                    <div className="trade-alert-main">
                      <div className="trade-alert-top">
                        <span className="trade-symbol">{alert.symbol || 'N/A'}</span>
                        <span className={`trade-action ${alert.action?.toLowerCase() || ''}`}>{alert.action || 'N/A'}</span>
                      </div>
                      <div className="trade-alert-bottom">
                        <span className="trade-entry">Entry {alert.price || 'N/A'}</span>
                        {alert.takeProfit && (
                          <span className="trade-take-profit">TP: {alert.takeProfit}</span>
                        )}
                        {alert.stopLoss && (
                          <span className="trade-stop-loss">SL: {alert.stopLoss}</span>
                        )}
                      </div>
                    </div>
                    {alert.chartLink && (
                      <a 
                        href={alert.chartLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-chart-button-inline"
                      >
                        View Chart
                      </a>
                    )}
                  </div>
                  {alert.createdAt && (
                    <span className="trade-alert-time">
                      {alert.createdAt.toDate ? 
                        alert.createdAt.toDate().toLocaleString() : 
                        new Date(alert.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Weekly Reports and Videos */}
        <div className="weekly-reports-section-top">
          <h2 className="section-title">Weekly Reports & Videos</h2>
          <div className="reports-list">
            {weeklyReports.length === 0 ? (
              <p className="no-items">No weekly reports available yet.</p>
            ) : (
              weeklyReports.map((report) => (
                <div key={report.id} className="report-card">
                  <h3 className="report-title">{report.title || 'Weekly Report'}</h3>
                  {report.description && (
                    <p className="report-description">{report.description}</p>
                  )}
                  <div className="report-actions">
                    {report.pdfUrl && (
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="report-link"
                      >
                        📄 View Report
                      </button>
                    )}
                    {report.videoUrl && (
                      <a 
                        href={report.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="report-link"
                      >
                        ▶️ Watch Video
                      </a>
                    )}
                  </div>
                  {report.createdAt && (
                    <span className="report-date">
                      {report.createdAt.toDate ? 
                        report.createdAt.toDate().toLocaleDateString() : 
                        new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Community Chat - Full Width Below */}
      <div className="community-chat-section-full">
        <div className="chat-container">
          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <p className="no-items">No messages yet. Start the conversation!</p>
            ) : (
              chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message-item ${msg.userId === user.uid ? 'own-message' : ''} ${msg.isAdmin ? 'admin-message' : ''}`}
                  >
                    <div className="message-header">
                      {msg.isAdmin && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="admin-badge-icon" width="16" height="16">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                        </svg>
                      )}
                      <span className="message-author">
                        {msg.isAdmin ? 'Admin' : getFirstName(msg.userName || msg.userEmail)}
                      </span>
                      <span className="message-time">
                        {msg.createdAt?.toDate ? 
                          msg.createdAt.toDate().toLocaleTimeString() : 
                          new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  {msg.message && (
                    <div className="message-content">{msg.message}</div>
                  )}
                  {msg.imageUrl && (
                    <div className="message-image">
                      <img src={msg.imageUrl} alt="Shared image" />
                    </div>
                  )}
                  {msg.fileUrl && (
                    <div className="message-file">
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                        📎 {msg.fileName || 'File'}
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows="2"
              />
              <div className="chat-attachments">
                <label className="chat-attachment-button" title="Upload image">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </label>
                <label className="chat-attachment-button" title="Upload file">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                </label>
              </div>
              <button type="submit" className="send-button" disabled={sendingMessage || (!newMessage.trim() && !imageFile && !fileAttachment)}>
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
            {(imageFile || fileAttachment) && (
              <div className="attachment-preview">
                {imageFile && <span>Image: {imageFile.name}</span>}
                {fileAttachment && <span>File: {fileAttachment.name}</span>}
                <button
                  type="button"
                  className="remove-attachment"
                  onClick={() => {
                    setImageFile(null)
                    setFileAttachment(null)
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {selectedReport && selectedReport.pdfUrl && (
        <div className="pdf-viewer-modal" onClick={() => setSelectedReport(null)}>
          <div className="pdf-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-viewer-header">
              <h3>{selectedReport.title || 'Weekly Report'}</h3>
              <button className="pdf-viewer-close" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="pdf-viewer-container">
              <iframe
                src={`${selectedReport.pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="pdf-viewer"
                title="Weekly Report PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunityContent

