import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './SupportPage.css'
import './HomePage.css'

const SupportPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="support-page home-page">
      <div className="support-page-container">
        <article className="support-content">
          <h1>Opessocius Support</h1>
          <p className="support-intro">Need help with the Opessocius App?</p>

          <h2>Chat with Support</h2>
          <p>
            You can speak directly with a member of the Opessocius support team from within the App.
          </p>
          <p>
            Open: <strong>Opessocius → Support → Chat</strong>
          </p>

          <h2>Email</h2>
          <p>
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>

          <h2>Telephone</h2>
          <p>
            <a href="tel:+34669887172">+34 669 887 172</a>
          </p>

          <h2>Address</h2>
          <p className="support-address">
            Calle Jorge Juan 72<br />
            28009 Madrid, Spain
          </p>

          <div className="support-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms and Conditions</Link>
          </div>
        </article>
      </div>
    </div>
  )
}

export default SupportPage
