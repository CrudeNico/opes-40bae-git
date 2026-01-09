import React, { useState, useEffect } from 'react'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import './News.css'

const News = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadNews()
  }, [])

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

  const handleNewsClick = (link) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="news-loading">
        <div className="loading-spinner">Loading news...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="news-error">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="news-container">
      <div className="news-content">
        <h2 className="news-title">Latest News</h2>
        
        {news.length === 0 ? (
          <div className="no-news">
            <p>No news articles available at the moment. Check back later!</p>
          </div>
        ) : (
          <div className="news-grid">
            {news.map((article) => (
              <div
                key={article.id}
                className="news-card"
                onClick={() => handleNewsClick(article.link)}
              >
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
                  {article.createdAt && (
                    <p className="news-card-date">
                      {new Date(article.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default News


