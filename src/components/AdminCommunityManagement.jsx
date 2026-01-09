import React, { useState, useEffect, useRef } from 'react'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { auth } from '../firebase/config'
import './AdminCommunityManagement.css'

const AdminCommunityManagement = () => {
  const [activeTab, setActiveTab] = useState('chat') // chat, tradeAlerts, weeklyReports
  const [user, setUser] = useState(null)
  
  // Chat states
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [fileAttachment, setFileAttachment] = useState(null)
  const messagesEndRef = useRef(null)

  // Trade Alerts states
  const [tradeAlerts, setTradeAlerts] = useState([])
  const [showAddAlert, setShowAddAlert] = useState(false)
  const [editingAlert, setEditingAlert] = useState(null)
  const [alertFormData, setAlertFormData] = useState({
    symbol: '',
    action: 'buy',
    price: '',
    takeProfit: '',
    stopLoss: '',
    chartLink: ''
  })

  // Weekly Reports states
  const [weeklyReports, setWeeklyReports] = useState([])
  const [showAddReport, setShowAddReport] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [reportFormData, setReportFormData] = useState({
    title: '',
    description: '',
    pdfFile: null,
    pdfUrl: '',
    videoUrl: ''
  })
  const [uploadingPdf, setUploadingPdf] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (activeTab === 'chat') {
      setupChatListener()
      // Auto-scroll to bottom when switching to chat tab
      setTimeout(() => {
        scrollToBottom()
      }, 100)
      // Cleanup old messages when switching to chat tab
      cleanupOldMessages()
    } else if (activeTab === 'tradeAlerts') {
      loadTradeAlerts()
    } else if (activeTab === 'weeklyReports') {
      loadWeeklyReports()
    }
    
    // Set up periodic cleanup (every hour)
    const cleanupInterval = setInterval(() => {
      if (activeTab === 'chat') {
        cleanupOldMessages()
      }
    }, 60 * 60 * 1000) // 1 hour
    
    return () => clearInterval(cleanupInterval)
  }, [activeTab])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [chatMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getFirstName = (name) => {
    if (!name) return 'User'
    return name.split(' ')[0]
  }

  const setupChatListener = () => {
    const db = getFirestore()
    const messagesQuery = query(
      collection(db, 'communityMessages'),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = []
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() })
      })
      setChatMessages(messages)
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
        isAdmin: true, // Mark as admin message
        createdAt: Timestamp.now()
      })

      setNewMessage('')
      setImageFile(null)
      setFileAttachment(null)
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

  const handleAddAlert = async (e) => {
    e.preventDefault()
    try {
      const db = getFirestore()
      if (editingAlert) {
        await updateDoc(doc(db, 'tradeAlerts', editingAlert.id), {
          ...alertFormData,
          price: parseFloat(alertFormData.price),
          takeProfit: alertFormData.takeProfit ? parseFloat(alertFormData.takeProfit) : null,
          stopLoss: alertFormData.stopLoss ? parseFloat(alertFormData.stopLoss) : null,
          chartLink: alertFormData.chartLink || null,
          updatedAt: Timestamp.now()
        })
      } else {
        await addDoc(collection(db, 'tradeAlerts'), {
          ...alertFormData,
          price: parseFloat(alertFormData.price),
          takeProfit: alertFormData.takeProfit ? parseFloat(alertFormData.takeProfit) : null,
          stopLoss: alertFormData.stopLoss ? parseFloat(alertFormData.stopLoss) : null,
          chartLink: alertFormData.chartLink || null,
          createdAt: Timestamp.now()
        })
      }
      setShowAddAlert(false)
      setEditingAlert(null)
      setAlertFormData({
        symbol: '',
        action: 'buy',
        price: '',
        takeProfit: '',
        stopLoss: '',
        chartLink: ''
      })
      loadTradeAlerts()
    } catch (error) {
      console.error('Error saving trade alert:', error)
    }
  }

  const handleEditAlert = (alert) => {
    setEditingAlert(alert)
    setAlertFormData({
      symbol: alert.symbol || '',
      action: alert.action || 'buy',
      price: alert.price?.toString() || '',
      takeProfit: alert.takeProfit?.toString() || '',
      stopLoss: alert.stopLoss?.toString() || '',
      chartLink: alert.chartLink || ''
    })
    setShowAddAlert(true)
  }

  const handleDeleteAlert = async (alertId) => {
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'tradeAlerts', alertId))
      loadTradeAlerts()
    } catch (error) {
      console.error('Error deleting trade alert:', error)
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

  const uploadPDF = async (file, reportId) => {
    try {
      const storage = getStorage()
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `weekly-reports/${reportId}/${timestamp}_${sanitizedName}`
      const storageRef = ref(storage, filename)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return downloadURL
    } catch (error) {
      console.error('Error uploading PDF:', error)
      throw error
    }
  }

  const handleAddReport = async (e) => {
    e.preventDefault()
    setUploadingPdf(true)
    try {
      const db = getFirestore()
      let pdfUrl = reportFormData.pdfUrl

      if (editingReport) {
        // For editing: upload PDF if a new file is selected
        if (reportFormData.pdfFile) {
          pdfUrl = await uploadPDF(reportFormData.pdfFile, editingReport.id)
        }

        const reportData = {
          title: reportFormData.title,
          description: reportFormData.description,
          pdfUrl: pdfUrl,
          videoUrl: reportFormData.videoUrl || null,
          updatedAt: Timestamp.now()
        }

        await updateDoc(doc(db, 'weeklyReports', editingReport.id), reportData)
      } else {
        // For new report: create document first, then upload PDF
        const docRef = await addDoc(collection(db, 'weeklyReports'), {
          title: reportFormData.title,
          description: reportFormData.description,
          pdfUrl: '',
          videoUrl: reportFormData.videoUrl || null,
          createdAt: Timestamp.now()
        })

        // Upload PDF with the new document ID
        if (reportFormData.pdfFile) {
          pdfUrl = await uploadPDF(reportFormData.pdfFile, docRef.id)
          await updateDoc(docRef, { pdfUrl: pdfUrl })
        }
      }
      setShowAddReport(false)
      setEditingReport(null)
      setReportFormData({
        title: '',
        description: '',
        pdfFile: null,
        pdfUrl: '',
        videoUrl: ''
      })
      loadWeeklyReports()
    } catch (error) {
      console.error('Error saving weekly report:', error)
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleEditReport = (report) => {
    setEditingReport(report)
    setReportFormData({
      title: report.title || '',
      description: report.description || '',
      pdfFile: null,
      pdfUrl: report.pdfUrl || '',
      videoUrl: report.videoUrl || ''
    })
    setShowAddReport(true)
  }

  const handlePdfFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setReportFormData({ ...reportFormData, pdfFile: file })
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleDeleteReport = async (reportId) => {
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'weeklyReports', reportId))
      loadWeeklyReports()
    } catch (error) {
      console.error('Error deleting weekly report:', error)
    }
  }

  return (
    <div className="admin-community-management">
      <div className="admin-community-tabs">
        <button
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Community Chat
        </button>
        <button
          className={`tab-button ${activeTab === 'tradeAlerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('tradeAlerts')}
        >
          Trade Alerts
        </button>
        <button
          className={`tab-button ${activeTab === 'weeklyReports' ? 'active' : ''}`}
          onClick={() => setActiveTab('weeklyReports')}
        >
          Weekly Reports & Videos
        </button>
      </div>

      {/* Community Chat Tab */}
      {activeTab === 'chat' && (
        <div className="admin-community-chat">
          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="no-items">No messages yet.</p>
              ) : (
                chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message-item ${msg.isAdmin ? 'admin-message' : ''}`}
                  >
                    <div className="message-header">
                      {msg.isAdmin && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="admin-badge-icon" width="16" height="16">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                        </svg>
                      )}
                      <span className="message-author">{msg.userName || msg.userEmail}</span>
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
      )}

      {/* Trade Alerts Tab */}
      {activeTab === 'tradeAlerts' && (
        <div className="admin-trade-alerts">
          <div className="section-header">
            <h2>Trade Alerts</h2>
            <button className="btn-primary" onClick={() => {
              setShowAddAlert(true)
              setEditingAlert(null)
              setAlertFormData({
                symbol: '',
                action: 'buy',
                price: '',
                takeProfit: '',
                stopLoss: '',
                chartLink: ''
              })
            }}>
              Add Trade Alert
            </button>
          </div>

          {showAddAlert && (
            <div className="form-widget">
              <h3>{editingAlert ? 'Edit' : 'Add'} Trade Alert</h3>
              <form onSubmit={handleAddAlert}>
                <div className="form-group">
                  <label>Symbol</label>
                  <input
                    type="text"
                    value={alertFormData.symbol}
                    onChange={(e) => setAlertFormData({ ...alertFormData, symbol: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Action</label>
                  <select
                    value={alertFormData.action}
                    onChange={(e) => setAlertFormData({ ...alertFormData, action: e.target.value })}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertFormData.price}
                    onChange={(e) => setAlertFormData({ ...alertFormData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Take Profit (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertFormData.takeProfit}
                    onChange={(e) => setAlertFormData({ ...alertFormData, takeProfit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Stop Loss (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alertFormData.stopLoss}
                    onChange={(e) => setAlertFormData({ ...alertFormData, stopLoss: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Chart Link (Optional)</label>
                  <input
                    type="url"
                    value={alertFormData.chartLink}
                    onChange={(e) => setAlertFormData({ ...alertFormData, chartLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save</button>
                  <button type="button" className="btn-secondary" onClick={() => {
                    setShowAddAlert(false)
                    setEditingAlert(null)
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="alerts-list">
            {tradeAlerts.length === 0 ? (
              <p className="no-items">No trade alerts yet.</p>
            ) : (
              tradeAlerts.map((alert) => (
                <div key={alert.id} className="alert-card">
                  <div className="alert-content">
                    <span className="trade-symbol">{alert.symbol}</span>
                    <span className="trade-action">{alert.action}</span>
                    <span className="trade-price">at {alert.price}</span>
                    {alert.takeProfit && <span className="trade-take-profit">TP: {alert.takeProfit}</span>}
                    {alert.stopLoss && <span className="trade-stop-loss">SL: {alert.stopLoss}</span>}
                    {alert.chartLink && <span className="trade-chart-link">📊 Chart Available</span>}
                  </div>
                  <div className="alert-actions">
                    <button className="btn-edit" onClick={() => handleEditAlert(alert)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDeleteAlert(alert.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Weekly Reports Tab */}
      {activeTab === 'weeklyReports' && (
        <div className="admin-weekly-reports">
          <div className="section-header">
            <h2>Weekly Reports & Videos</h2>
            <button className="btn-primary" onClick={() => {
              setShowAddReport(true)
              setEditingReport(null)
              setReportFormData({
                title: '',
                description: '',
                pdfFile: null,
                pdfUrl: '',
                videoUrl: ''
              })
            }}>
              Add Report
            </button>
          </div>

          {showAddReport && (
            <div className="form-widget">
              <h3>{editingReport ? 'Edit' : 'Add'} Weekly Report</h3>
              <form onSubmit={handleAddReport}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={reportFormData.title}
                    onChange={(e) => setReportFormData({ ...reportFormData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={reportFormData.description}
                    onChange={(e) => setReportFormData({ ...reportFormData, description: e.target.value })}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>PDF File {editingReport && reportFormData.pdfUrl && '(Leave empty to keep current)'}</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileChange}
                  />
                  {reportFormData.pdfFile && (
                    <p className="file-selected">Selected: {reportFormData.pdfFile.name}</p>
                  )}
                  {editingReport && reportFormData.pdfUrl && !reportFormData.pdfFile && (
                    <p className="current-file">Current PDF: {reportFormData.pdfUrl.substring(reportFormData.pdfUrl.lastIndexOf('/') + 1)}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Video URL</label>
                  <input
                    type="url"
                    value={reportFormData.videoUrl}
                    onChange={(e) => setReportFormData({ ...reportFormData, videoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={uploadingPdf}>
                    {uploadingPdf ? 'Uploading...' : 'Save'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => {
                    setShowAddReport(false)
                    setEditingReport(null)
                    setReportFormData({
                      title: '',
                      description: '',
                      pdfFile: null,
                      pdfUrl: '',
                      videoUrl: ''
                    })
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="reports-list">
            {weeklyReports.length === 0 ? (
              <p className="no-items">No weekly reports yet.</p>
            ) : (
              weeklyReports.map((report) => (
                <div key={report.id} className="report-card">
                  <h3>{report.title}</h3>
                  {report.description && <p>{report.description}</p>}
                  <div className="report-actions">
                    {report.pdfUrl && (
                      <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer" className="report-link">
                        📄 View Report
                      </a>
                    )}
                    {report.videoUrl && (
                      <a href={report.videoUrl} target="_blank" rel="noopener noreferrer" className="report-link">
                        ▶️ Watch Video
                      </a>
                    )}
                  </div>
                  <div className="report-admin-actions">
                    <button className="btn-edit" onClick={() => handleEditReport(report)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDeleteReport(report.id)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCommunityManagement

