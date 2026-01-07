import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import './AdminNewsManagement.css'

const AdminNewsManagement = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNews, setEditingNews] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    link: '',
    imageUrl: ''
  })

  useEffect(() => {
    loadNews()
  }, [])

  useEffect(() => {
    if (editingNews) {
      setFormData({
        title: editingNews.title || '',
        summary: editingNews.summary || '',
        link: editingNews.link || '',
        imageUrl: editingNews.imageUrl || ''
      })
      setImagePreview(editingNews.imageUrl || null)
      setImageFile(null)
    } else {
      setFormData({
        title: '',
        summary: '',
        link: '',
        imageUrl: ''
      })
      setImagePreview(null)
      setImageFile(null)
    }
  }, [editingNews])

  const loadNews = async () => {
    try {
      const db = getFirestore()
      const newsCollection = collection(db, 'news')
      const newsQuery = query(newsCollection, orderBy('createdAt', 'desc'))
      const newsSnapshot = await getDocs(newsQuery)
      
      const newsList = []
      newsSnapshot.forEach((doc) => {
        newsList.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setNews(newsList)
    } catch (error) {
      console.error('Error loading news:', error)
      setError('Failed to load news. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file) => {
    try {
      const storage = getStorage()
      const timestamp = Date.now()
      const filename = `news/${timestamp}_${file.name}`
      const storageRef = ref(storage, filename)
      
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      
      return downloadURL
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error('Failed to upload image')
    }
  }

  const handleAddNews = async () => {
    if (!formData.title || !formData.link) {
      setError('Title and link are required')
      return
    }

    setLoadingAction(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      let imageUrl = formData.imageUrl

      // Upload image if a new file was selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const newsData = {
        title: formData.title,
        summary: formData.summary || '',
        link: formData.link,
        imageUrl: imageUrl || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await addDoc(collection(db, 'news'), newsData)

      setSuccess('News article added successfully!')
      setShowAddForm(false)
      setFormData({
        title: '',
        summary: '',
        link: '',
        imageUrl: ''
      })
      setImageFile(null)
      setImagePreview(null)
      await loadNews()
    } catch (error) {
      console.error('Error adding news:', error)
      setError(`Failed to add news: ${error.message}`)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUpdateNews = async () => {
    if (!formData.title || !formData.link) {
      setError('Title and link are required')
      return
    }

    setLoadingAction(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()
      let imageUrl = formData.imageUrl

      // Upload new image if a file was selected
      if (imageFile) {
        // Delete old image if it exists
        if (editingNews.imageUrl) {
          try {
            const storage = getStorage()
            // Extract the path from the URL (e.g., "news/123456_filename.jpg" from full URL)
            const urlPath = editingNews.imageUrl.split('/o/')[1]?.split('?')[0]
            if (urlPath) {
              const decodedPath = decodeURIComponent(urlPath)
              const oldImageRef = ref(storage, decodedPath)
              await deleteObject(oldImageRef)
            }
          } catch (deleteError) {
            console.warn('Could not delete old image:', deleteError)
            // Continue even if deletion fails
          }
        }
        imageUrl = await uploadImage(imageFile)
      }

      const newsData = {
        title: formData.title,
        summary: formData.summary || '',
        link: formData.link,
        imageUrl: imageUrl,
        updatedAt: Timestamp.now()
      }

      const newsDocRef = doc(db, 'news', editingNews.id)
      await updateDoc(newsDocRef, newsData)

      setSuccess('News article updated successfully!')
      setEditingNews(null)
      setFormData({
        title: '',
        summary: '',
        link: '',
        imageUrl: ''
      })
      setImageFile(null)
      setImagePreview(null)
      await loadNews()
    } catch (error) {
      console.error('Error updating news:', error)
      setError(`Failed to update news: ${error.message}`)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteNews = async (newsId, imageUrl) => {
    setLoadingAction(true)
    setError('')
    setSuccess('')

    try {
      const db = getFirestore()

      // Delete image from storage if it exists
      if (imageUrl) {
        try {
          const storage = getStorage()
          // Extract the path from the URL (e.g., "news/123456_filename.jpg" from full URL)
          const urlPath = imageUrl.split('/o/')[1]?.split('?')[0]
          if (urlPath) {
            const decodedPath = decodeURIComponent(urlPath)
            const imageRef = ref(storage, decodedPath)
            await deleteObject(imageRef)
          }
        } catch (deleteError) {
          console.warn('Could not delete image from storage:', deleteError)
          // Continue even if deletion fails
        }
      }

      // Delete news document
      const newsDocRef = doc(db, 'news', newsId)
      await deleteDoc(newsDocRef)

      setSuccess('News article deleted successfully!')
      await loadNews()
    } catch (error) {
      console.error('Error deleting news:', error)
      setError(`Failed to delete news: ${error.message}`)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingNews(null)
    setFormData({
      title: '',
      summary: '',
      link: '',
      imageUrl: ''
    })
    setImageFile(null)
    setImagePreview(null)
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="admin-news-loading">
        <div className="loading-spinner">Loading news...</div>
      </div>
    )
  }

  return (
    <div className="admin-news-management">
      <div className="admin-news-header">
        <h2 className="panel-title">News Management</h2>
        <button
          className="btn-add-news"
          onClick={() => {
            setShowAddForm(true)
            setEditingNews(null)
            setError('')
            setSuccess('')
          }}
          disabled={showAddForm || editingNews}
        >
          + Add News Article
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add/Edit Form */}
      {(showAddForm || editingNews) && (
        <div className="news-form-container">
          <h3 className="form-title">{editingNews ? 'Edit News Article' : 'Add News Article'}</h3>
          
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter news title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Summary</label>
            <textarea
              className="form-textarea"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Enter news summary"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Link *</label>
            <input
              type="url"
              className="form-input"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://example.com/news-article"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image</label>
            <input
              type="file"
              accept="image/*"
              className="form-file-input"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
            {!imagePreview && formData.imageUrl && (
              <div className="image-preview">
                <img src={formData.imageUrl} alt="Current" />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={loadingAction}
            >
              Cancel
            </button>
            <button
              className="btn-submit"
              onClick={editingNews ? handleUpdateNews : handleAddNews}
              disabled={loadingAction || !formData.title || !formData.link}
            >
              {loadingAction ? 'Saving...' : editingNews ? 'Update Article' : 'Add Article'}
            </button>
          </div>
        </div>
      )}

      {/* News List */}
      <div className="news-list">
        {news.length === 0 ? (
          <div className="no-news">
            <p>No news articles found. Click "Add News Article" to create one.</p>
          </div>
        ) : (
          <div className="news-grid">
            {news.map((article) => (
              <div key={article.id} className="news-card">
                {article.imageUrl && (
                  <div className="news-card-image">
                    <img src={article.imageUrl} alt={article.title} />
                  </div>
                )}
                <div className="news-card-content">
                  <h3 className="news-card-title">{article.title}</h3>
                  {article.summary && (
                    <p className="news-card-summary">{article.summary}</p>
                  )}
                  {article.link && (
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-card-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {article.link}
                    </a>
                  )}
                  {article.createdAt && (
                    <p className="news-card-date">
                      Created: {new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  <div className="news-card-actions">
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setEditingNews(article)
                        setShowAddForm(false)
                        setError('')
                        setSuccess('')
                      }}
                      disabled={showAddForm || loadingAction}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteNews(article.id, article.imageUrl)}
                      disabled={showAddForm || loadingAction}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminNewsManagement

