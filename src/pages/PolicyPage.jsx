import React, { useEffect } from 'react'
import './PolicyPage.css'
import './HomePage.css'

const PolicyPage = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return (
    <div className="home-page">
      <div className="container" style={{ padding: '8rem 2rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '4rem', 
          borderRadius: '1rem',
          color: '#ffffff',
          lineHeight: '1.8',
          fontSize: '1.1rem'
        }}>
          {/* Privacy Policy */}
          <h1 style={{ fontSize: '2.5rem', marginBottom: '3rem', color: '#ffffff', borderBottom: '2px solid rgba(255, 255, 255, 0.2)', paddingBottom: '1rem' }}>
            Privacy Policy
          </h1>
          <p style={{ marginBottom: '2rem' }}>
            This Privacy Policy describes how Company Name (the "Company", "we", "us", or "our") collects, uses, stores, processes, protects, and discloses information obtained from users ("you", "your") who access or use our website, platforms, products, or services (collectively, the "Services").
          </p>
          <p style={{ marginBottom: '3rem' }}>
            By accessing or using the Services, you expressly acknowledge that you have read, understood, and agreed to the practices described in this Privacy Policy. If you do not agree, you must immediately discontinue use of the Services.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>1. Information We Collect</h2>
          <p style={{ marginBottom: '1rem' }}>
            We may collect information including, but not limited to:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Personal information voluntarily provided by you, such as name, email address, company affiliation, contact details, or other identifying data</li>
            <li>Technical and usage information, including IP address, device identifiers, browser type, operating system, timestamps, referring URLs, and interaction data</li>
            <li>Any information submitted through forms, communications, uploads, or inquiries</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            We do not guarantee that any information you provide will be complete, accurate, or current, and we assume no responsibility for verifying such information.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>2. Use of Information</h2>
          <p style={{ marginBottom: '1rem' }}>
            We may use collected information for purposes including, but not limited to:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Operating, maintaining, and improving the Services</li>
            <li>Responding to inquiries or communications</li>
            <li>Internal analytics, research, compliance, and risk management</li>
            <li>Enforcing our Terms of Use and protecting our legal rights</li>
            <li>Complying with applicable laws, regulations, or lawful requests</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            Nothing in this Privacy Policy shall be construed as obligating us to use information in any particular manner or for any specific purpose.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>3. Disclosure of Information</h2>
          <p style={{ marginBottom: '1rem' }}>
            We may disclose information, at our sole discretion:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>To service providers, contractors, or partners performing services on our behalf</li>
            <li>To legal, regulatory, or governmental authorities when required or deemed appropriate</li>
            <li>In connection with corporate transactions, restructuring, or asset transfers</li>
            <li>To protect our rights, property, security, or interests</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            We expressly disclaim any responsibility for how third parties use, store, or process information once disclosed in accordance with this policy.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>4. Data Retention</h2>
          <p style={{ marginBottom: '1rem' }}>
            We retain information for as long as we deem necessary or appropriate for business, legal, or operational purposes.
          </p>
          <p style={{ marginBottom: '2rem' }}>
            We are under no obligation to retain any information for any minimum period, unless required by law.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>5. Data Security</h2>
          <p style={{ marginBottom: '1rem' }}>
            We implement reasonable administrative, technical, and organizational measures to protect information.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            However, no system is secure, and we make no guarantees regarding the absolute security of any data.
          </p>
          <p style={{ marginBottom: '2rem' }}>
            You acknowledge and accept that you provide information at your own risk.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>6. International Transfers</h2>
          <p style={{ marginBottom: '1rem' }}>
            Your information may be transferred to, stored in, and processed in jurisdictions outside your country of residence.
          </p>
          <p style={{ marginBottom: '2rem' }}>
            By using the Services, you expressly consent to such transfers.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>7. User Rights</h2>
          <p style={{ marginBottom: '1rem' }}>
            Any rights you may have under applicable data protection laws are subject to legal limitations, exemptions, and verification requirements.
          </p>
          <p style={{ marginBottom: '4rem' }}>
            Nothing in this policy constitutes a waiver of any rights or defenses available to the Company under applicable law.
          </p>

          {/* Cookie Policy */}
          <h1 style={{ fontSize: '2.5rem', marginTop: '4rem', marginBottom: '3rem', color: '#ffffff', borderTop: '2px solid rgba(255, 255, 255, 0.2)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)', paddingTop: '2rem', paddingBottom: '1rem' }}>
            Cookie Policy
          </h1>
          <p style={{ marginBottom: '3rem' }}>
            This Cookie Policy explains how we use cookies and similar technologies on our website.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>1. What Are Cookies</h2>
          <p style={{ marginBottom: '2rem' }}>
            Cookies are small data files placed on your device to enable functionality, analytics, and operational efficiency.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>2. Types of Cookies We Use</h2>
          <p style={{ marginBottom: '1rem' }}>
            We may use, without limitation:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Strictly necessary cookies</li>
            <li>Functional cookies</li>
            <li>Performance and analytics cookies</li>
            <li>Security and integrity cookies</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            We reserve the right to add, remove, or modify cookies at any time without notice.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>3. Consent and Control</h2>
          <p style={{ marginBottom: '1rem' }}>
            By continuing to use the website, you consent to the use of cookies as described herein.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            You may configure your browser to restrict or block cookies; however, doing so may impair functionality.
          </p>
          <p style={{ marginBottom: '4rem' }}>
            We disclaim all liability for any loss or degradation of service resulting from cookie restrictions.
          </p>

          {/* Terms of Use */}
          <h1 style={{ fontSize: '2.5rem', marginTop: '4rem', marginBottom: '3rem', color: '#ffffff', borderTop: '2px solid rgba(255, 255, 255, 0.2)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)', paddingTop: '2rem', paddingBottom: '1rem' }}>
            Terms of Use
          </h1>
          <p style={{ marginBottom: '3rem' }}>
            These Terms of Use govern access to and use of the Services. By accessing the Services, you agree to be legally bound by these Terms.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>1. No Authorization or License</h2>
          <p style={{ marginBottom: '1rem' }}>
            Nothing on this website or within the Services:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Constitutes legal, financial, investment, regulatory, tax, or professional advice</li>
            <li>Grants any license, authorization, or right except as expressly stated</li>
            <li>Creates any fiduciary, advisory, or client relationship</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            Any reliance on information provided is strictly at your own risk.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>2. Permitted Use</h2>
          <p style={{ marginBottom: '1rem' }}>
            You may use the Services solely for lawful, non-prohibited purposes.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            You are expressly not authorized to:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Copy, reproduce, distribute, scrape, or exploit content</li>
            <li>Reverse engineer, interfere with, or disrupt the Services</li>
            <li>Use the Services for unlawful, misleading, or harmful purposes</li>
            <li>Misrepresent affiliation, endorsement, or authorization</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            We reserve the right to restrict or terminate access at our sole discretion.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>3. Intellectual Property</h2>
          <p style={{ marginBottom: '1rem' }}>
            All content, trademarks, logos, software, and materials are owned by or licensed to the Company and are protected by applicable intellectual property laws.
          </p>
          <p style={{ marginBottom: '2rem' }}>
            No rights are granted except as explicitly stated. All rights are expressly reserved.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>4. Disclaimers</h2>
          <p style={{ marginBottom: '1rem' }}>
            The Services are provided "as is" and "as available", without warranties of any kind, express or implied.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            We expressly disclaim all warranties, including but not limited to:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Accuracy, completeness, or reliability</li>
            <li>Fitness for a particular purpose</li>
            <li>Non-infringement</li>
            <li>Availability or uninterrupted operation</li>
          </ul>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>5. Limitation of Liability</h2>
          <p style={{ marginBottom: '1rem' }}>
            To the maximum extent permitted by law, the Company shall not be liable for:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Direct, indirect, incidental, consequential, or punitive damages</li>
            <li>Loss of data, profits, business, or opportunities</li>
            <li>Errors, omissions, delays, or interruptions</li>
          </ul>
          <p style={{ marginBottom: '2rem' }}>
            This limitation applies regardless of theory of liability.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>6. Indemnification</h2>
          <p style={{ marginBottom: '1rem' }}>
            You agree to indemnify, defend, and hold harmless the Company from any claims, damages, losses, liabilities, or expenses arising from:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '2rem' }}>
            <li>Your use of the Services</li>
            <li>Your violation of these Terms</li>
            <li>Your infringement of any rights</li>
          </ul>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>7. Modifications</h2>
          <p style={{ marginBottom: '2rem' }}>
            We reserve the right to modify these policies and terms at any time without prior notice.
            Continued use of the Services constitutes acceptance of any changes.
          </p>

          <h2 style={{ fontSize: '1.8rem', marginTop: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>8. Governing Law</h2>
          <p style={{ marginBottom: '2rem' }}>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict-of-law principles.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PolicyPage
