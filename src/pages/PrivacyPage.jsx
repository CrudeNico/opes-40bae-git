import React, { useEffect } from 'react'
import './PrivacyPage.css'
import './HomePage.css'

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="privacy-page home-page">
      <div className="privacy-page-container">
        <article className="privacy-content">
          <h1>Privacy Policy</h1>
          <p className="privacy-updated"><strong>Last updated: 15 August 2026</strong></p>

          <p>
            This Privacy Policy explains how <strong>Nicolás De Rodrigo Fernández</strong>, operating individually under the name <strong>Opessocius</strong> (“Opessocius”, “we”, “us” or “our”), collects, uses, stores, shares and protects personal data when you access or use the Opessocius mobile application, website, support services and related functionality (collectively, the <strong>“Service”</strong>).
          </p>
          <p>It also explains your privacy rights and how you may exercise them.</p>
          <p>
            By using the Service, you acknowledge that your personal data will be handled as described in this Privacy Policy.
          </p>

          <hr />

          <h2>1. Data Controller</h2>
          <p>The data controller responsible for the processing of personal data through Opessocius is:</p>
          <p className="privacy-address">
            <strong>Nicolás De Rodrigo Fernández</strong><br />
            Individual / Sole Operator<br />
            Calle Jorge Juan 72<br />
            28009 Madrid<br />
            Madrid<br />
            Spain
          </p>
          <p><strong>Trading name:</strong> Opessocius</p>
          <p>
            <strong>Privacy and support contact:</strong><br />
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>
            <strong>Website:</strong><br />
            <a href="https://opessocius.com" target="_blank" rel="noopener noreferrer">opessocius.com</a>
          </p>
          <p>
            Questions about this Privacy Policy or requests concerning your personal data may be sent to the email address above.
          </p>

          <hr />

          <h2>2. Who May Use Opessocius</h2>
          <p>
            Opessocius is intended exclusively for persons who are <strong>18 years of age or older</strong>.
          </p>
          <p>
            Users must provide their date of birth during the application process. Users who do not meet the minimum age requirement are not permitted to create or maintain an Opessocius account.
          </p>
          <p>Opessocius is not directed at children or persons under the age of 18.</p>
          <p>
            If we become aware that a person under 18 has provided personal data through the Service contrary to this requirement, we may take appropriate steps to delete the account and associated personal data.
          </p>

          <hr />

          <h2>3. Personal Data We Collect</h2>
          <p>
            The information we collect depends on the features you use and the information you choose or are required to provide.
          </p>

          <h3>3.1 Account and identity information</h3>
          <p>When you create or use an Opessocius account, we may collect:</p>
          <ul>
            <li>first name;</li>
            <li>last name;</li>
            <li>display name;</li>
            <li>email address;</li>
            <li>telephone number;</li>
            <li>residential address;</li>
            <li>country;</li>
            <li>date of birth;</li>
            <li>account status;</li>
            <li>internal member identifier;</li>
            <li>Firebase user identifier;</li>
            <li>profile information;</li>
            <li>optional profile photograph.</li>
          </ul>
          <p>
            Your password is processed through Firebase Authentication. Opessocius does not store your plain-text password in its application database.
          </p>

          <hr />

          <h2>4. Application Information</h2>
          <p>
            As part of onboarding, application review and account administration, we may collect information including:
          </p>
          <ul>
            <li>your main goals;</li>
            <li>risk-related information;</li>
            <li>investor type or priority;</li>
            <li>indicated or starting amount;</li>
            <li>time horizon;</li>
            <li>financial or investment objectives;</li>
            <li>information about your preferences;</li>
            <li>other answers provided during the application process.</li>
          </ul>
          <p>
            Certain onboarding questions may be used temporarily within the application interface without being permanently stored on our servers.
          </p>
          <p>
            Your application may be reviewed by an authorised administrator before access to the main Service is granted.
          </p>
          <p>
            Approval or denial of an application is not performed solely through an automated decision-making system.
          </p>

          <hr />

          <h2>5. Financial and Performance Information</h2>
          <p>
            Opessocius may process and display financial or investment-related information associated with your account, including:
          </p>
          <ul>
            <li>informational account balances;</li>
            <li>allocations;</li>
            <li>targets;</li>
            <li>portfolio information;</li>
            <li>ledger records;</li>
            <li>performance information;</li>
            <li>profit and loss information;</li>
            <li>returns;</li>
            <li>performance history;</li>
            <li>amount-based requests;</li>
            <li>allocation or movement requests;</li>
            <li>records described within the application as deposit, withdrawal, movement or similar requests.</li>
          </ul>
          <p>
            These records are used to provide account information, reporting, administrative workflows and related functionality.
          </p>

          <h3>Opessocius does not process investment money through the app</h3>
          <p>The current Service does <strong>not</strong>:</p>
          <ul>
            <li>collect your payment-card details;</li>
            <li>collect your bank login credentials;</li>
            <li>collect IBAN details through the app;</li>
            <li>connect directly to your bank account;</li>
            <li>connect directly to a brokerage account;</li>
            <li>connect directly to a cryptocurrency exchange or wallet;</li>
            <li>execute banking transfers;</li>
            <li>execute broker transactions;</li>
            <li>custody money through the application;</li>
            <li>process deposits or withdrawals through an in-app payment processor.</li>
          </ul>
          <p>
            Amounts and transaction-like information displayed in Opessocius are informational or administrative records within the Service.
          </p>
          <p>
            A request created through the application does not itself constitute a banking or payment transaction.
          </p>

          <hr />

          <h2>6. User Content</h2>
          <p>
            We may process information that you voluntarily submit through Service features, including:
          </p>
          <ul>
            <li>Community messages;</li>
            <li>support messages;</li>
            <li>notes;</li>
            <li>requests;</li>
            <li>consultation information;</li>
            <li>consultation agendas;</li>
            <li>application answers;</li>
            <li>profile photographs;</li>
            <li>documents;</li>
            <li>permitted attachments;</li>
            <li>reports;</li>
            <li>Community reports or moderation requests.</li>
          </ul>
          <p>
            Content posted within Community functionality may be visible to other users who have access to that functionality.
          </p>

          <hr />

          <h2>7. Documents and Files</h2>
          <p>
            Opessocius may make private documents available to you or allow authorised files to be associated with your account.
          </p>
          <p>These may include:</p>
          <ul>
            <li>PDF documents;</li>
            <li>contracts;</li>
            <li>account documents;</li>
            <li>profile photographs;</li>
            <li>other files made available through relevant Service functionality.</li>
          </ul>
          <p>
            These files may be stored using Google Firebase Storage and associated with your account.
          </p>
          <p>
            Access is restricted according to the applicable account and administrative permissions.
          </p>

          <hr />

          <h2>8. Support Information</h2>
          <p>
            If you contact Opessocius through in-app support, email or other support functionality, we may process:
          </p>
          <ul>
            <li>your name;</li>
            <li>email address;</li>
            <li>account identifier;</li>
            <li>support messages;</li>
            <li>permitted attachments;</li>
            <li>correspondence;</li>
            <li>timestamps;</li>
            <li>information necessary to investigate and respond to your request.</li>
          </ul>
          <p>
            We use this information to provide customer support, resolve issues and maintain appropriate records relating to support interactions.
          </p>

          <hr />

          <h2>9. Community Information</h2>
          <p>If you use Community functionality, we may process:</p>
          <ul>
            <li>messages you post;</li>
            <li>your displayed identity;</li>
            <li>timestamps;</li>
            <li>reports;</li>
            <li>blocks;</li>
            <li>moderation information;</li>
            <li>rate-limit information;</li>
            <li>information necessary to prevent misuse of Community functionality.</li>
          </ul>
          <p>
            Automated filters may be used to prevent prohibited terms or content from being posted.
          </p>
          <p>
            Such filters are used for content moderation and Service protection and are not used to make credit, investment, employment or similarly significant automated decisions about you.
          </p>

          <hr />

          <h2>10. Consultations</h2>
          <p>If you use consultation or mentorship functionality, we may process:</p>
          <ul>
            <li>requested or confirmed meeting times;</li>
            <li>your time zone;</li>
            <li>optional agenda information;</li>
            <li>account identifiers;</li>
            <li>consultation status;</li>
            <li>meeting or joining links.</li>
          </ul>
          <p>
            Where a consultation uses a third-party meeting service, such as Google Meet, your interaction with that third-party service may also be subject to that provider&apos;s own privacy terms.
          </p>

          <hr />

          <h2>11. Learning and Service Progress</h2>
          <p>
            Where learning functionality is available, Opessocius may process information about your progress, including completed modules or lessons.
          </p>
          <p>
            Some progress information may also be cached locally on your device to provide application functionality.
          </p>

          <hr />

          <h2>12. Device and Technical Information</h2>
          <p>
            We may automatically generate or process limited technical information necessary to operate, secure and maintain the Service, including:
          </p>
          <ul>
            <li>Firebase user identifier;</li>
            <li>timestamps;</li>
            <li>application-generated device identifier;</li>
            <li>authentication and session information;</li>
            <li>Expo push token;</li>
            <li>notification preferences;</li>
            <li>security events;</li>
            <li>operational identifiers;</li>
            <li>rate-limit information;</li>
            <li>limited IP-address information;</li>
            <li>operational error information.</li>
          </ul>
          <p>
            For certain password-reset and abuse-prevention systems, an IP address or email address may be transformed using hashing or similar mechanisms before being stored for rate-limiting purposes.
          </p>
          <p>
            These systems are designed to help prevent abuse, unauthorised access and excessive requests.
          </p>

          <hr />

          <h2>13. Local Device Storage</h2>
          <p>
            Certain information may be stored locally on your device using application storage technologies.
          </p>
          <p>This can include:</p>
          <ul>
            <li>authentication-session information;</li>
            <li>interface preferences;</li>
            <li>theme preferences;</li>
            <li>accessibility or motion preferences;</li>
            <li>notification settings;</li>
            <li>application-generated device identifiers;</li>
            <li>notification prompt status;</li>
            <li>learning-progress cache;</li>
            <li>limited temporary application data.</li>
          </ul>
          <p>
            Server-side account deletion does not necessarily erase information already stored locally on your device.
          </p>
          <p>
            You may remove remaining local application data by deleting the application or clearing its local data using the controls available on your device.
          </p>

          <hr />

          <h2>14. Camera and Photo Library</h2>
          <p>With your permission, Opessocius may request access to your:</p>
          <ul>
            <li>camera; and/or</li>
            <li>photo library.</li>
          </ul>
          <p>
            These permissions may be used when you choose to take or select a profile photograph or use another feature that requires an image.
          </p>
          <p>
            Images you choose to upload may leave your device and be stored using Firebase Storage.
          </p>
          <p>
            Opessocius does not require microphone access for profile-photo functionality.
          </p>
          <p>
            You may revoke camera or photo-library permission at any time through your iOS device settings.
          </p>
          <p>
            Some functionality requiring those permissions may no longer be available after permission is revoked.
          </p>

          <hr />

          <h2>15. Push Notifications</h2>
          <p>If you enable push notifications, we may process:</p>
          <ul>
            <li>an Expo push token;</li>
            <li>an application-generated device identifier;</li>
            <li>device platform information;</li>
            <li>notification preferences;</li>
            <li>notification payloads;</li>
            <li>delivery information.</li>
          </ul>
          <p>Push notifications may relate to:</p>
          <ul>
            <li>account updates;</li>
            <li>inbox information;</li>
            <li>market-related information where enabled;</li>
            <li>support;</li>
            <li>consultations;</li>
            <li>other relevant Service functionality.</li>
          </ul>
          <p>
            Push delivery is facilitated through <strong>Expo</strong> and <strong>Apple Push Notification Service (APNs)</strong>.
          </p>
          <p>You may disable push notifications through your device settings.</p>
          <p>
            Where available, you can also control categories of notifications from within Opessocius.
          </p>

          <hr />

          <h2>16. Email Communications</h2>
          <p>
            Opessocius uses email to provide operational and account-related communications.
          </p>
          <p>These may include:</p>
          <ul>
            <li>password-reset messages;</li>
            <li>account updates;</li>
            <li>application-related messages;</li>
            <li>consultation information;</li>
            <li>administrative communications;</li>
            <li>support communications;</li>
            <li>deletion confirmations;</li>
            <li>other Service-related notifications.</li>
          </ul>
          <p>
            For this purpose, information such as your name, email address, subject, email content and permitted attachments may be processed by our email service provider.
          </p>

          <hr />

          <h2>17. How We Use Personal Data</h2>
          <p>We process personal data for purposes including:</p>
          <ul>
            <li>creating and authenticating user accounts;</li>
            <li>verifying eligibility to use the Service;</li>
            <li>processing and reviewing applications;</li>
            <li>providing account functionality;</li>
            <li>administering user profiles;</li>
            <li>displaying informational portfolio and performance information;</li>
            <li>processing administrative requests;</li>
            <li>providing Community features;</li>
            <li>delivering private documents;</li>
            <li>recording learning progress;</li>
            <li>managing consultations;</li>
            <li>providing customer support;</li>
            <li>sending transactional communications;</li>
            <li>delivering push notifications;</li>
            <li>maintaining notification preferences;</li>
            <li>securing accounts;</li>
            <li>preventing fraud, spam, misuse and unauthorised access;</li>
            <li>enforcing rate limits;</li>
            <li>moderating Community functionality;</li>
            <li>maintaining operational and security audit records;</li>
            <li>troubleshooting technical problems;</li>
            <li>complying with applicable legal obligations;</li>
            <li>responding to lawful requests;</li>
            <li>establishing, exercising or defending legal claims;</li>
            <li>processing account-deletion requests.</li>
          </ul>
          <p>
            We do not use the personal data described in this Privacy Policy for third-party behavioural advertising.
          </p>

          <hr />

          <h2>18. Legal Bases for Processing</h2>
          <p>
            Where the General Data Protection Regulation (“GDPR”) applies, we process personal data only where an appropriate legal basis exists.
          </p>
          <p>
            Depending on the particular processing activity, we may rely on the following legal bases.
          </p>

          <h3>18.1 Performance of a contract and pre-contractual steps</h3>
          <p>
            We process information where necessary to provide the Service you request or to take steps requested by you before providing the Service.
          </p>
          <p>This can include:</p>
          <ul>
            <li>account registration;</li>
            <li>application processing;</li>
            <li>authentication;</li>
            <li>account administration;</li>
            <li>account functionality;</li>
            <li>support;</li>
            <li>consultations;</li>
            <li>requested account actions.</li>
          </ul>

          <h3>18.2 Legitimate interests</h3>
          <p>
            We may process personal data where necessary for our legitimate interests, provided those interests are not overridden by your fundamental rights and freedoms.
          </p>
          <p>These interests can include:</p>
          <ul>
            <li>protecting the security of Opessocius;</li>
            <li>preventing fraud and abuse;</li>
            <li>protecting user accounts;</li>
            <li>operating and maintaining the Service;</li>
            <li>providing customer support;</li>
            <li>maintaining appropriate operational records;</li>
            <li>enforcing platform rules;</li>
            <li>troubleshooting technical problems;</li>
            <li>protecting our legal rights.</li>
          </ul>

          <h3>18.3 Compliance with legal obligations</h3>
          <p>
            We may process or retain information where necessary to comply with obligations imposed by applicable law, regulation, court order or another legally binding requirement.
          </p>

          <h3>18.4 Consent</h3>
          <p>
            Where processing depends on your consent or permission, such as certain device permissions, you may withdraw that permission at any time.
          </p>
          <p>
            For iOS permissions, you can normally do this through your device settings.
          </p>
          <p>
            Withdrawal does not affect the lawfulness of processing performed before permission or consent was withdrawn.
          </p>

          <hr />

          <h2>19. Third-Party Service Providers</h2>
          <p>
            We use third-party providers where necessary to operate the Service.
          </p>
          <p>
            These providers may process personal data on our behalf or provide infrastructure through which personal data is transmitted.
          </p>

          <h3>19.1 Google Firebase and Google Cloud</h3>
          <p>Opessocius uses Google/Firebase services including:</p>
          <ul>
            <li>Firebase Authentication;</li>
            <li>Cloud Firestore;</li>
            <li>Firebase Storage;</li>
            <li>Cloud Functions;</li>
            <li>related Google Cloud infrastructure.</li>
          </ul>
          <p>These services may process information including:</p>
          <ul>
            <li>account information;</li>
            <li>authentication information;</li>
            <li>user profiles;</li>
            <li>application information;</li>
            <li>informational financial records;</li>
            <li>Community content;</li>
            <li>support information;</li>
            <li>documents;</li>
            <li>notification data;</li>
            <li>operational and security information.</li>
          </ul>
          <p>
            Our Cloud Functions are configured in the European <code>europe-west1</code> region.
          </p>
          <p>
            The exact processing and storage location may vary depending on the particular Google/Firebase service and its configuration.
          </p>

          <h3>19.2 Resend</h3>
          <p>
            We use <strong>Resend</strong> to send transactional and administrative email.
          </p>
          <p>Information processed through Resend may include:</p>
          <ul>
            <li>email address;</li>
            <li>recipient name;</li>
            <li>message subject;</li>
            <li>message body;</li>
            <li>applicable account-related information;</li>
            <li>permitted attachments.</li>
          </ul>

          <h3>19.3 Expo</h3>
          <p>
            We use <strong>Expo</strong> services in connection with application infrastructure and push notifications.
          </p>
          <p>For push notifications, Expo may receive information such as:</p>
          <ul>
            <li>Expo push token;</li>
            <li>notification title;</li>
            <li>notification body;</li>
            <li>routing information necessary to open the appropriate application screen.</li>
          </ul>

          <h3>19.4 Apple</h3>
          <p>
            For iOS push notifications, information necessary for notification delivery is processed through <strong>Apple Push Notification Service (APNs)</strong>.
          </p>

          <h3>19.5 Google Meet and meeting providers</h3>
          <p>
            If a consultation includes a Google Meet or other external meeting link, the relevant provider may process information when you choose to access its service.
          </p>

          <hr />

          <h2>20. External Content and Websites</h2>
          <p>
            Opessocius may display, embed or link to external content or websites.
          </p>
          <p>
            Depending on the content made available within the Service, these may include services such as:
          </p>
          <ul>
            <li>TradingView;</li>
            <li>YouTube;</li>
            <li>Google Meet;</li>
            <li>Unsplash;</li>
            <li>external market or economic-information websites;</li>
            <li>other third-party websites linked from the Service.</li>
          </ul>
          <p>
            When you open or interact with third-party content, the relevant provider may receive technical information such as your IP address, browser or device information according to its own systems and privacy practices.
          </p>
          <p>
            Third-party services are governed by their own privacy policies and terms.
          </p>
          <p>
            Opessocius does not control the independent privacy practices of third-party websites that you choose to access.
          </p>

          <hr />

          <h2>21. Data Sharing</h2>
          <p>
            We do not disclose personal data to third parties except where necessary for purposes including:
          </p>
          <ul>
            <li>providing the Service;</li>
            <li>cloud hosting and infrastructure;</li>
            <li>authentication;</li>
            <li>email delivery;</li>
            <li>push-notification delivery;</li>
            <li>consultations or third-party content requested by the user;</li>
            <li>security and fraud prevention;</li>
            <li>compliance with law;</li>
            <li>responding to lawful governmental, regulatory or judicial requests;</li>
            <li>protecting our rights or the rights and safety of users or others.</li>
          </ul>
          <p>Our primary technical service providers include:</p>
          <ul>
            <li>Google/Firebase;</li>
            <li>Google Cloud;</li>
            <li>Expo;</li>
            <li>Apple;</li>
            <li>Resend;</li>
            <li>Google Meet where used.</li>
          </ul>
          <p>
            Where third parties process personal data on our behalf, we require or rely on applicable contractual and legal safeguards appropriate to the processing.
          </p>

          <hr />

          <h2>22. No Sale of Personal Data</h2>
          <p>
            <strong>Opessocius does not sell or rent your personal data to advertisers or data brokers.</strong>
          </p>
          <p>
            The current application does not include third-party advertising networks.
          </p>

          <hr />

          <h2>23. Advertising and Tracking</h2>
          <p>The current version of Opessocius does not use:</p>
          <ul>
            <li>IDFA for advertising;</li>
            <li>third-party behavioural advertising;</li>
            <li>advertising networks;</li>
            <li>advertising attribution SDKs;</li>
            <li>cross-app advertising tracking;</li>
            <li>personalised advertising SDKs.</li>
          </ul>
          <p>
            Opessocius therefore does not currently request Apple&apos;s App Tracking Transparency permission for advertising tracking.
          </p>
          <p>
            If our practices materially change in the future, we will update this Privacy Policy and applicable platform privacy disclosures and obtain any required permissions.
          </p>

          <hr />

          <h2>24. Analytics and Diagnostics</h2>
          <p>
            The current production implementation does not intentionally initialise a dedicated third-party product-analytics SDK to analyse user behaviour.
          </p>
          <p>
            The Service may nevertheless create operational information necessary for:
          </p>
          <ul>
            <li>security;</li>
            <li>auditing;</li>
            <li>abuse prevention;</li>
            <li>error investigation;</li>
            <li>backend operations;</li>
            <li>troubleshooting.</li>
          </ul>
          <p>
            Google Cloud infrastructure may also process operational logging generated by backend functions.
          </p>
          <p>
            If we introduce additional analytics or diagnostic technology in the future, we will review and update our privacy disclosures where necessary.
          </p>

          <hr />

          <h2>25. International Data Transfers</h2>
          <p>
            Some of our service providers operate internationally, which means personal data may be processed outside Spain or the European Economic Area (“EEA”).
          </p>
          <p>
            Where the GDPR applies and personal data is transferred to a country that is not recognised as providing an adequate level of data protection, we rely on an applicable lawful transfer mechanism where required.
          </p>
          <p>
            Depending on the provider and processing activity, such mechanisms may include:
          </p>
          <ul>
            <li>an applicable adequacy decision;</li>
            <li>the EU-U.S. Data Privacy Framework where valid and applicable;</li>
            <li>European Commission Standard Contractual Clauses (“SCCs”);</li>
            <li>other safeguards permitted under applicable data-protection law.</li>
          </ul>
          <p>
            Google&apos;s applicable Firebase data-processing terms provide mechanisms for restricted international transfers, including applicable transfer solutions and Standard Contractual Clauses.
          </p>
          <p>
            Expo&apos;s applicable terms provide Standard Contractual Clause mechanisms for relevant international transfers of end-user data.
          </p>
          <p>
            Resend processes certain data in the United States and its Data Processing Addendum provides Standard Contractual Clauses for applicable transfers from the EEA.
          </p>
          <p>
            You may contact us at{' '}
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
            {' '}if you would like further information about safeguards applicable to your personal data.
          </p>

          <hr />

          <h2>26. Data Retention</h2>
          <p>
            We retain personal data only for as long as necessary for the purpose for which it was collected, to provide the Service, and to satisfy applicable legal, security and operational requirements.
          </p>
          <p>
            Where a specific retention period is not technically fixed, retention is determined according to factors including:
          </p>
          <ul>
            <li>whether your account remains active;</li>
            <li>whether the information is necessary to provide the Service;</li>
            <li>the nature and purpose of the information;</li>
            <li>applicable security requirements;</li>
            <li>dispute-resolution requirements;</li>
            <li>applicable legal or regulatory obligations;</li>
            <li>whether deletion has been requested.</li>
          </ul>

          <h3>Current technical retention periods</h3>
          <p>
            Certain categories currently have specific technical retention controls.
          </p>

          <h4>Community data</h4>
          <p>
            Certain Community messages, reports and associated records are generally configured for approximately <strong>30 days</strong> of retention through applicable cleanup or expiration mechanisms.
          </p>

          <h4>Audit and security records</h4>
          <p>
            Certain operational audit records and security-event records are generally configured for approximately <strong>30 days</strong>.
          </p>

          <h4>Push-notification records</h4>
          <p>
            Inactive push tokens and certain Expo push-receipt records are generally configured for approximately <strong>30 days</strong> before expiry or cleanup.
          </p>
          <p>
            Active push tokens may remain while required for notification functionality until replaced, disabled, deactivated or the relevant account is deleted.
          </p>

          <h4>Password-reset security data</h4>
          <p>
            Certain password-reset rate-limiting information is retained for short periods, generally measured in hours, for abuse-prevention purposes.
          </p>

          <h4>Administrative email campaign records</h4>
          <p>
            Certain administrative email-campaign records may be configured for retention for up to <strong>seven years</strong> for administrative, accountability, record-keeping and compliance purposes.
          </p>

          <h4>Account and Service information</h4>
          <p>
            Account profiles, application information, informational financial records, support information, consultations, learning information and user documents may be retained while your account remains active and for as long as necessary to provide the applicable Service.
          </p>
          <p>
            They are subject to the account-deletion process described below unless continued retention is required or permitted by applicable law.
          </p>

          <hr />

          <h2>27. Account Deletion</h2>
          <p>
            All Opessocius users who have created an account can initiate deletion of their account from within the application.
          </p>
          <p>This includes:</p>
          <ul>
            <li>approved users;</li>
            <li>users whose applications are pending;</li>
            <li>users whose applications have been denied.</li>
          </ul>

          <h3>Approved accounts</h3>
          <p>Approved users can initiate deletion through:</p>
          <p><strong>Profile → Settings → Delete account</strong></p>

          <h3>Pending accounts</h3>
          <p>
            Users with a pending application can initiate deletion from the <strong>Pending Approval</strong> screen using <strong>Delete account</strong>.
          </p>

          <h3>Denied accounts</h3>
          <p>
            Users whose application has been denied can sign in and initiate deletion from the denied-access screen using <strong>Delete account</strong>.
          </p>

          <h3>Deletion process</h3>
          <p>
            When you select <strong>Request account deletion</strong>, the application creates an account-deletion request.
          </p>
          <p>
            The deletion process normally completes within <strong>30 days</strong>.
          </p>
          <p>
            Deletion may require administrative processing rather than occurring immediately.
          </p>
          <p>
            When the deletion process is completed, we delete the account and associated personal data that we are not legally or legitimately required to retain.
          </p>
          <p>
            A confirmation email may be sent when deletion is completed.
          </p>

          <hr />

          <h2>28. Information Deleted With Your Account</h2>
          <p>
            Depending on the information associated with your account, the deletion process is designed to remove applicable:
          </p>
          <ul>
            <li>Firebase Authentication account;</li>
            <li>account profile;</li>
            <li>pending application information;</li>
            <li>informational investment or portfolio profile;</li>
            <li>portfolio-performance information;</li>
            <li>portfolio and ledger records associated with you;</li>
            <li>account-related requests;</li>
            <li>Community messages associated with your account;</li>
            <li>Community reports and blocks associated with your account;</li>
            <li>in-app notifications;</li>
            <li>notification preferences;</li>
            <li>push-token records;</li>
            <li>support tickets and associated information;</li>
            <li>consultation records;</li>
            <li>private user-document records;</li>
            <li>profile photographs and user-specific uploaded files;</li>
            <li>learning progress;</li>
            <li>Plus access requests;</li>
            <li>email-delivery metadata associated with your user identifier;</li>
            <li>applicable audit information associated directly with your user identifier;</li>
            <li>account-closure request itself following completion.</li>
          </ul>
          <p>
            Where shared administrative records contain information relating to multiple people, identifiers associated specifically with your account may be removed rather than deleting the entire shared record.
          </p>

          <hr />

          <h2>29. Information That May Temporarily Remain After Deletion</h2>
          <p>
            Account deletion does not necessarily result in every technical record disappearing from every system instantaneously.
          </p>
          <p>
            Limited information may temporarily remain where necessary or technically unavoidable, including:
          </p>
          <ul>
            <li>security-event records subject to short retention periods;</li>
            <li>Expo notification-delivery receipts subject to expiration;</li>
            <li>short-lived password-reset abuse-prevention records;</li>
            <li>provider-side email records;</li>
            <li>provider-side operational records;</li>
            <li>system logs;</li>
            <li>backups;</li>
            <li>information required to comply with applicable law;</li>
            <li>information necessary to establish, exercise or defend legal claims.</li>
          </ul>
          <p>
            Such information will not be retained for ordinary active account use after deletion and will be removed or anonymised when the applicable retention requirement expires, where appropriate.
          </p>
          <p>
            Information stored locally on your device may also remain until the application&apos;s local data is cleared or the application is removed.
          </p>

          <hr />

          <h2>30. Cancelling an Account-Deletion Request</h2>
          <p>
            Where the application&apos;s deletion workflow permits it and deletion has not yet been completed, you may be able to cancel an account-deletion request while it remains in an eligible pending status.
          </p>
          <p>
            Once deletion has been completed, your account and deleted information may not be recoverable.
          </p>

          <hr />

          <h2>31. Your GDPR and Data-Protection Rights</h2>
          <p>Subject to applicable law, you may have the right to:</p>

          <h3>Right of access</h3>
          <p>
            Request confirmation of whether we process your personal data and request access to that data.
          </p>

          <h3>Right to rectification</h3>
          <p>
            Request correction of inaccurate or incomplete personal data.
          </p>

          <h3>Right to erasure</h3>
          <p>
            Request deletion of personal data where the applicable legal requirements are satisfied.
          </p>

          <h3>Right to restriction</h3>
          <p>
            Request that processing of your personal data be restricted in certain circumstances.
          </p>

          <h3>Right to object</h3>
          <p>
            Object to processing based on legitimate interests in circumstances provided by applicable law.
          </p>

          <h3>Right to data portability</h3>
          <p>
            Request certain personal data in a structured, commonly used and machine-readable format where the legal requirements for portability apply.
          </p>

          <h3>Right to withdraw consent</h3>
          <p>
            Where processing is based on consent, withdraw your consent at any time without affecting the lawfulness of processing performed before withdrawal.
          </p>

          <h3>Right to complain</h3>
          <p>
            You have the right to lodge a complaint with a competent data-protection supervisory authority.
          </p>
          <p>For users in Spain, the competent supervisory authority is the:</p>
          <p>
            <strong>Agencia Española de Protección de Datos (AEPD)</strong>
          </p>
          <p>
            You may contact the AEPD directly if you believe your personal data has been processed in violation of applicable data-protection law.
          </p>

          <hr />

          <h2>32. How to Exercise Your Privacy Rights</h2>
          <p>To exercise an applicable privacy right, contact:</p>
          <p>
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>Please clearly state the nature of your request.</p>
          <p>
            We may need to verify your identity before responding to a request in order to prevent unauthorised access to or deletion of another person&apos;s data.
          </p>
          <p>
            We will respond within the time limits required by applicable data-protection law.
          </p>
          <p>
            Certain rights are subject to legal limitations and exceptions.
          </p>

          <hr />

          <h2>33. Automated Decision-Making</h2>
          <p>
            Opessocius does not currently use artificial intelligence, credit scoring or another solely automated system to make decisions producing legal or similarly significant effects concerning users.
          </p>
          <p>
            Important application decisions, including approval or denial of account access, involve human administrative review.
          </p>
          <p>
            Automated systems may nevertheless be used for limited operational purposes such as:
          </p>
          <ul>
            <li>content filtering;</li>
            <li>rate limiting;</li>
            <li>spam prevention;</li>
            <li>security monitoring;</li>
            <li>abuse prevention.</li>
          </ul>
          <p>
            These systems are not used to perform automated investment eligibility, credit or financial scoring.
          </p>

          <hr />

          <h2>34. Security</h2>
          <p>
            We implement technical and organisational measures intended to protect personal data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure or access.
          </p>
          <p>Current safeguards include, where applicable:</p>
          <ul>
            <li>HTTPS-secured communications;</li>
            <li>Firebase Authentication;</li>
            <li>database access controls;</li>
            <li>Firestore security rules;</li>
            <li>Firebase Storage security rules;</li>
            <li>authenticated backend operations;</li>
            <li>restricted administrative operations;</li>
            <li>server-side secrets management;</li>
            <li>password-reset rate limiting;</li>
            <li>abuse-prevention mechanisms;</li>
            <li>audit controls;</li>
            <li>redaction of selected sensitive information from operational records.</li>
          </ul>
          <p>
            No electronic storage or transmission system can be guaranteed to be completely secure.
          </p>
          <p>
            Users are responsible for keeping their login credentials confidential and for notifying us if they believe their account has been compromised.
          </p>

          <hr />

          <h2>35. Data Breaches and Security Incidents</h2>
          <p>
            If we become aware of a personal-data breach, we will assess the incident and take actions required under applicable data-protection law.
          </p>
          <p>
            Where legally required, this may include notifying the relevant supervisory authority and affected users.
          </p>

          <hr />

          <h2>36. Changes to the Service or Our Data Practices</h2>
          <p>
            If we introduce new functionality that materially changes how personal data is collected, used or shared, we may update this Privacy Policy and any applicable App Store privacy disclosures before or when the change takes effect.
          </p>
          <p>Examples may include the future introduction of:</p>
          <ul>
            <li>analytics technology;</li>
            <li>additional authentication providers;</li>
            <li>payment functionality;</li>
            <li>additional third-party processors;</li>
            <li>advertising;</li>
            <li>tracking;</li>
            <li>new categories of personal data.</li>
          </ul>
          <p>
            Where consent or another specific permission is legally required for new processing, we will request it as appropriate.
          </p>

          <hr />

          <h2>37. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy periodically to reflect:</p>
          <ul>
            <li>changes to the Service;</li>
            <li>technical changes;</li>
            <li>changes to our data practices;</li>
            <li>new service providers;</li>
            <li>security requirements;</li>
            <li>regulatory requirements;</li>
            <li>changes in applicable law.</li>
          </ul>
          <p>
            When we update the Privacy Policy, the <strong>Last updated</strong> date at the top of this document will be revised.
          </p>
          <p>
            Where required by law or appropriate because of the significance of a change, additional notice may be provided.
          </p>

          <hr />

          <h2>38. Contact</h2>
          <p>
            For privacy enquiries, account-deletion questions or requests concerning your personal data, contact:
          </p>
          <p className="privacy-address">
            <strong>Nicolás De Rodrigo Fernández</strong><br />
            Individual / Sole Operator<br />
            Operating as <strong>Opessocius</strong><br />
            Calle Jorge Juan 72<br />
            28009 Madrid<br />
            Madrid<br />
            Spain
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>
            <strong>Website:</strong>{' '}
            <a href="https://opessocius.com" target="_blank" rel="noopener noreferrer">opessocius.com</a>
          </p>

          <hr />

          <p className="privacy-effective">
            <strong>Effective date: 15 August 2026</strong>
          </p>
        </article>
      </div>
    </div>
  )
}

export default PrivacyPage
