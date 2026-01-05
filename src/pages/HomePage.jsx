import React from 'react'
import './HomePage.css'

const HomePage = () => {
  return (
    <div className="home-page">
      <header className="header">
        <nav className="nav">
          <div className="nav-container">
            <div className="logo">
              <h1>Ops</h1>
            </div>
            <ul className="nav-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <button className="menu-toggle" aria-label="Toggle menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-content">
            <h2 className="hero-title">Welcome to Ops</h2>
            <p className="hero-subtitle">
              Building modern solutions for today's challenges
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary">Get Started</button>
              <button className="btn btn-secondary">Learn More</button>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2 className="section-title">Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🚀</div>
                <h3>Fast & Reliable</h3>
                <p>Built with modern technologies for optimal performance</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Responsive Design</h3>
                <p>Works seamlessly on all devices and screen sizes</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Secure</h3>
                <p>Enterprise-grade security for your peace of mind</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container">
            <h2>Ready to get started?</h2>
            <p>Join us today and experience the difference</p>
            <button className="btn btn-primary btn-large">Contact Us</button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 Ops. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage

