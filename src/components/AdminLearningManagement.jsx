import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import './AdminLearningManagement.css'

const AdminLearningManagement = () => {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModule, setShowAddModule] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [selectedModule, setSelectedModule] = useState(null)
  const [editingSubModule, setEditingSubModule] = useState(null)
  const [editingContent, setEditingContent] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [viewingContent, setViewingContent] = useState(null)

  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    subtext: ''
  })

  const [subModuleFormData, setSubModuleFormData] = useState({
    title: ''
  })

  const [contentFormData, setContentFormData] = useState({
    pdfUrl: ''
  })
  const [pdfFile, setPdfFile] = useState(null)

  useEffect(() => {
    loadModules()
  }, [])

  useEffect(() => {
    if (editingModule) {
      setModuleFormData({
        title: editingModule.title || '',
        subtext: editingModule.subtext || ''
      })
    } else {
      setModuleFormData({
        title: '',
        subtext: ''
      })
    }
  }, [editingModule])

  useEffect(() => {
    if (editingSubModule) {
      setSubModuleFormData({
        title: editingSubModule.title || '',
        subtext: editingSubModule.subtext || ''
      })
    } else {
      setSubModuleFormData({
        title: '',
        subtext: ''
      })
    }
  }, [editingSubModule])

  useEffect(() => {
    if (editingContent) {
      const moduleData = modules.find(m => m.id === selectedModule?.id)
      const subModuleData = moduleData?.subModules?.find(sm => sm.id === editingContent.id)
      setContentFormData({
        pdfUrl: subModuleData?.content?.pdfUrl || ''
      })
      setPdfFile(null)
    } else {
      setContentFormData({
        pdfUrl: ''
      })
      setPdfFile(null)
    }
  }, [editingContent, selectedModule, modules])

  const loadModules = async () => {
    try {
      const db = getFirestore()
      const modulesCollection = collection(db, 'learningModules')
      const modulesQuery = query(modulesCollection, orderBy('order', 'asc'))
      const modulesSnapshot = await getDocs(modulesQuery)
      
      const modulesList = []
      modulesSnapshot.forEach((doc) => {
        modulesList.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setModules(modulesList)
    } catch (error) {
      console.error('Error loading modules:', error)
      setError('Failed to load modules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePdfChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file')
        return
      }
      setPdfFile(file)
    }
  }

  const uploadPDF = async (file, moduleId, subModuleId) => {
    try {
      const storage = getStorage()
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `learning/${moduleId}/${subModuleId}/${timestamp}_${sanitizedName}`
      const storageRef = ref(storage, filename)
      
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      
      return downloadURL
    } catch (error) {
      console.error('Error uploading PDF:', error)
      throw new Error('Failed to upload PDF')
    }
  }

  const handleAddModule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingAction(true)

    try {
      const db = getFirestore()
      const newModule = {
        title: moduleFormData.title.trim(),
        subtext: moduleFormData.subtext.trim() || '',
        order: modules.length,
        subModules: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await addDoc(collection(db, 'learningModules'), newModule)
      setSuccess('Module added successfully!')
      setShowAddModule(false)
      setModuleFormData({ title: '', subtext: '' })
      loadModules()
    } catch (error) {
      console.error('Error adding module:', error)
      setError('Failed to add module. Please try again.')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUpdateModule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingAction(true)

    try {
      const db = getFirestore()
      await updateDoc(doc(db, 'learningModules', editingModule.id), {
        title: moduleFormData.title.trim(),
        subtext: moduleFormData.subtext.trim() || '',
        updatedAt: Timestamp.now()
      })

      setSuccess('Module updated successfully!')
      setEditingModule(null)
      setModuleFormData({ title: '', subtext: '' })
      loadModules()
    } catch (error) {
      console.error('Error updating module:', error)
      setError('Failed to update module. Please try again.')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteModule = async (moduleId) => {

    try {
      const db = getFirestore()
      const module = modules.find(m => m.id === moduleId)
      
      // Delete all PDFs from storage
      if (module.subModules) {
        const storage = getStorage()
        for (const subModule of module.subModules) {
          if (subModule.content?.pdfUrl) {
            try {
              const pdfPath = subModule.content.pdfUrl
              const urlParts = pdfPath.split('/o/')
              if (urlParts.length > 1) {
                const pathPart = urlParts[1].split('?')[0]
                const decodedPath = decodeURIComponent(pathPart)
                const pdfRef = ref(storage, decodedPath)
                await deleteObject(pdfRef)
              }
            } catch (error) {
              console.error('Error deleting PDF:', error)
            }
          }
        }
      }

      await deleteDoc(doc(db, 'learningModules', moduleId))
      setSuccess('Module deleted successfully!')
      loadModules()
    } catch (error) {
      console.error('Error deleting module:', error)
      setError('Failed to delete module. Please try again.')
    }
  }

  const handleAddSubModule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingAction(true)

    try {
      const db = getFirestore()
      const moduleRef = doc(db, 'learningModules', selectedModule.id)
      const moduleData = modules.find(m => m.id === selectedModule.id)
      const currentSubModules = moduleData.subModules || []
      
      const newSubModule = {
        id: `sub-${Date.now()}`,
        title: subModuleFormData.title.trim(),
        subtext: subModuleFormData.subtext.trim() || '',
        order: currentSubModules.length,
        content: {
          pdfUrl: ''
        },
        createdAt: Timestamp.now()
      }

      const updatedSubModules = [...currentSubModules, newSubModule]
      
      await updateDoc(moduleRef, {
        subModules: updatedSubModules,
        updatedAt: Timestamp.now()
      })

      setSuccess('Sub-module added successfully!')
      setSubModuleFormData({ title: '', subtext: '' })
      loadModules()
      setSelectedModule({ ...moduleData, subModules: updatedSubModules })
    } catch (error) {
      console.error('Error adding sub-module:', error)
      setError('Failed to add sub-module. Please try again.')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUpdateSubModule = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingAction(true)

    try {
      const db = getFirestore()
      const moduleRef = doc(db, 'learningModules', selectedModule.id)
      const moduleData = modules.find(m => m.id === selectedModule.id)
      const currentSubModules = moduleData.subModules || []
      
      const updatedSubModules = currentSubModules.map(subModule =>
        subModule.id === editingSubModule.id
          ? { ...subModule, title: subModuleFormData.title.trim(), subtext: subModuleFormData.subtext.trim() || '' }
          : subModule
      )
      
      await updateDoc(moduleRef, {
        subModules: updatedSubModules,
        updatedAt: Timestamp.now()
      })

      setSuccess('Sub-module updated successfully!')
      setEditingSubModule(null)
      setSubModuleFormData({ title: '', subtext: '' })
      loadModules()
      setSelectedModule({ ...moduleData, subModules: updatedSubModules })
    } catch (error) {
      console.error('Error updating sub-module:', error)
      setError('Failed to update sub-module. Please try again.')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDeleteSubModule = async (subModuleId) => {

    try {
      const db = getFirestore()
      const moduleRef = doc(db, 'learningModules', selectedModule.id)
      const moduleData = modules.find(m => m.id === selectedModule.id)
      const currentSubModules = moduleData.subModules || []
      
      const subModuleToDelete = currentSubModules.find(sm => sm.id === subModuleId)
      
      // Delete PDF from storage if exists
      if (subModuleToDelete?.content?.pdfUrl) {
        try {
          const storage = getStorage()
          const pdfPath = subModuleToDelete.content.pdfUrl
          const urlParts = pdfPath.split('/o/')
          if (urlParts.length > 1) {
            const pathPart = urlParts[1].split('?')[0]
            const decodedPath = decodeURIComponent(pathPart)
            const pdfRef = ref(storage, decodedPath)
            await deleteObject(pdfRef)
          }
        } catch (error) {
          console.error('Error deleting PDF:', error)
        }
      }

      const updatedSubModules = currentSubModules.filter(sm => sm.id !== subModuleId)
      
      await updateDoc(moduleRef, {
        subModules: updatedSubModules,
        updatedAt: Timestamp.now()
      })

      setSuccess('Sub-module deleted successfully!')
      loadModules()
      setSelectedModule({ ...moduleData, subModules: updatedSubModules })
    } catch (error) {
      console.error('Error deleting sub-module:', error)
      setError('Failed to delete sub-module. Please try again.')
    }
  }

  const handleUpdateContent = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingAction(true)

    try {
      const db = getFirestore()
      const storage = getStorage()
      let pdfUrl = contentFormData.pdfUrl

      // Upload new PDF if selected
      if (pdfFile) {
        const moduleData = modules.find(m => m.id === selectedModule.id)
        const subModuleData = moduleData.subModules.find(sm => sm.id === editingContent.id)
        
        // Delete old PDF if exists
        if (subModuleData?.content?.pdfUrl) {
          try {
            const pdfPath = subModuleData.content.pdfUrl
            const urlParts = pdfPath.split('/o/')
            if (urlParts.length > 1) {
              const pathPart = urlParts[1].split('?')[0]
              const decodedPath = decodeURIComponent(pathPart)
              const oldPdfRef = ref(storage, decodedPath)
              await deleteObject(oldPdfRef)
            }
          } catch (error) {
            console.error('Error deleting old PDF:', error)
          }
        }

        pdfUrl = await uploadPDF(pdfFile, selectedModule.id, editingContent.id)
      }

      const moduleRef = doc(db, 'learningModules', selectedModule.id)
      const moduleData = modules.find(m => m.id === selectedModule.id)
      const currentSubModules = moduleData.subModules || []
      
      const updatedSubModules = currentSubModules.map(subModule =>
        subModule.id === editingContent.id
          ? {
              ...subModule,
              content: {
                pdfUrl: pdfUrl
              }
            }
          : subModule
      )
      
      await updateDoc(moduleRef, {
        subModules: updatedSubModules,
        updatedAt: Timestamp.now()
      })

      setSuccess('Content updated successfully!')
      setEditingContent(null)
      setContentFormData({ pdfUrl: '' })
      setPdfFile(null)
      loadModules()
      setSelectedModule({ ...moduleData, subModules: updatedSubModules })
    } catch (error) {
      console.error('Error updating content:', error)
      setError('Failed to update content. Please try again.')
    } finally {
      setLoadingAction(false)
    }
  }

  if (loading) {
    return <div className="admin-learning-loading">Loading modules...</div>
  }

  // Show sub-modules management for selected module
  if (selectedModule && !editingContent) {
    const moduleData = modules.find(m => m.id === selectedModule.id)
    const subModules = moduleData?.subModules || []

    return (
      <div className="admin-learning-container">
        <div className="admin-learning-header">
          <button className="back-button" onClick={() => setSelectedModule(null)}>
            ← Back to Modules
          </button>
          <h2>Manage Sub-Modules: {moduleData?.title}</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-learning-actions">
          <button className="btn btn-primary" onClick={() => setEditingSubModule(null)}>
            + Add Sub-Module
          </button>
        </div>

        {/* Add/Edit Sub-Module Form */}
        {!editingSubModule && (
          <div className="admin-learning-form-section">
            <h3>Add New Sub-Module</h3>
            <form onSubmit={handleAddSubModule}>
              <div className="form-group">
                <label>Sub-Module Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={subModuleFormData.title}
                  onChange={(e) => setSubModuleFormData({ ...subModuleFormData, title: e.target.value })}
                  required
                  placeholder="Enter sub-module title"
                />
              </div>
              <div className="form-group">
                <label>Subtext (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={subModuleFormData.subtext}
                  onChange={(e) => setSubModuleFormData({ ...subModuleFormData, subtext: e.target.value })}
                  placeholder="Enter sub-module subtext"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loadingAction}>
                  {loadingAction ? 'Adding...' : 'Add Sub-Module'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSubModuleFormData({ title: '', subtext: '' })}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {editingSubModule && (
          <div className="admin-learning-form-section">
            <h3>Edit Sub-Module</h3>
            <form onSubmit={handleUpdateSubModule}>
              <div className="form-group">
                <label>Sub-Module Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={subModuleFormData.title}
                  onChange={(e) => setSubModuleFormData({ ...subModuleFormData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subtext (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={subModuleFormData.subtext}
                  onChange={(e) => setSubModuleFormData({ ...subModuleFormData, subtext: e.target.value })}
                  placeholder="Enter sub-module subtext"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loadingAction}>
                  {loadingAction ? 'Updating...' : 'Update Sub-Module'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSubModule(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sub-Modules List */}
        <div className="admin-learning-list">
          <h3>Sub-Modules ({subModules.length})</h3>
          {subModules.length === 0 ? (
            <p className="no-items">No sub-modules yet. Add one to get started.</p>
          ) : (
            <div className="sub-modules-grid">
              {subModules.map((subModule, index) => (
                <div key={subModule.id} className="sub-module-card">
                  <div className="sub-module-header">
                    <span className="sub-module-number">{index + 1}</span>
                    <h4>{subModule.title}</h4>
                  </div>
                  <div className="sub-module-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setEditingSubModule(subModule)
                        setSubModuleFormData({ title: subModule.title })
                      }}
                    >
                      Edit Title
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setEditingContent(subModule)
                      }}
                    >
                      Edit Content
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleDeleteSubModule(subModule.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show content viewer
  if (viewingContent) {
    const moduleData = modules.find(m => m.id === selectedModule?.id)
    const subModuleData = moduleData?.subModules?.find(sm => sm.id === viewingContent.id)
    const pdfUrl = subModuleData?.content?.pdfUrl

    return (
      <div className="admin-learning-container">
        <div className="admin-learning-header">
          <button className="back-button" onClick={() => {
            setViewingContent(null)
          }}>
            ← Back to Sub-Modules
          </button>
          <h2>View Content: {viewingContent.title}</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-learning-form-section">
          {pdfUrl ? (
            <div className="pdf-viewer-container">
              <iframe
                src={`${pdfUrl}#toolbar=0`}
                className="pdf-viewer"
                title="PDF Viewer"
              />
            </div>
          ) : (
            <p className="no-items">No content uploaded yet.</p>
          )}
        </div>
      </div>
    )
  }

  // Show content editor
  if (editingContent) {
    const moduleData = modules.find(m => m.id === selectedModule?.id)
    const subModuleData = moduleData?.subModules?.find(sm => sm.id === editingContent.id)
    const currentPdfUrl = subModuleData?.content?.pdfUrl || ''

    return (
      <div className="admin-learning-container">
        <div className="admin-learning-header">
          <button className="back-button" onClick={() => {
            setEditingContent(null)
            setContentFormData({ pdfUrl: '' })
            setPdfFile(null)
          }}>
            ← Back to Sub-Modules
          </button>
          <h2>Edit Content: {editingContent.title}</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="admin-learning-form-section">
          <form onSubmit={handleUpdateContent}>
            <div className="form-group">
              <label>PDF Document *</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="form-input"
              />
              {pdfFile && (
                <div className="pdf-preview">
                  <p>Selected: {pdfFile.name}</p>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => {
                      setPdfFile(null)
                    }}
                  >
                    Remove PDF
                  </button>
                </div>
              )}
              {currentPdfUrl && !pdfFile && (
                <div className="pdf-preview">
                  <p>Current PDF: <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer">View Current PDF</a></p>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loadingAction || (!pdfFile && !currentPdfUrl)}>
                {loadingAction ? 'Updating...' : 'Update Content'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingContent(null)
                  setContentFormData({ pdfUrl: '' })
                  setPdfFile(null)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Main modules view
  return (
    <div className="admin-learning-container">
      <div className="admin-learning-header">
        <h2>Learning Modules Management</h2>
        <button className="btn btn-primary" onClick={() => {
          setShowAddModule(true)
          setEditingModule(null)
          setModuleFormData({ title: '' })
        }}>
          + Add Module
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add/Edit Module Form */}
      {(showAddModule || editingModule) && (
        <div className="admin-learning-form-section">
          <h3>{editingModule ? 'Edit Module' : 'Add New Module'}</h3>
          <form onSubmit={editingModule ? handleUpdateModule : handleAddModule}>
            <div className="form-group">
              <label>Module Title *</label>
              <input
                type="text"
                className="form-input"
                value={moduleFormData.title}
                onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                required
                placeholder="Enter module title"
              />
            </div>
            <div className="form-group">
              <label>Subtext (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={moduleFormData.subtext}
                onChange={(e) => setModuleFormData({ ...moduleFormData, subtext: e.target.value })}
                placeholder="Enter module subtext"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loadingAction}>
                {loadingAction ? (editingModule ? 'Updating...' : 'Adding...') : (editingModule ? 'Update Module' : 'Add Module')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddModule(false)
                  setEditingModule(null)
                  setModuleFormData({ title: '' })
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modules List */}
      <div className="admin-learning-list">
        <h3>Modules ({modules.length})</h3>
        {modules.length === 0 ? (
          <p className="no-items">No modules yet. Add one to get started.</p>
        ) : (
          <div className="modules-grid">
            {modules.map((module, index) => (
              <div key={module.id} className="module-card">
                <div className="module-header">
                  <span className="module-number">{index + 1}</span>
                  <h4>{module.title}</h4>
                </div>
                <div className="module-info">
                  <p>Sub-Modules: {module.subModules?.length || 0}</p>
                </div>
                <div className="module-actions">
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      setSelectedModule(module)
                    }}
                  >
                    Manage Sub-Modules
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      setEditingModule(module)
                      setShowAddModule(false)
                      setModuleFormData({ title: module.title })
                    }}
                  >
                    Edit Title
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDeleteModule(module.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminLearningManagement

