import React, { useEffect } from 'react'
import './TermsPage.css'
import './HomePage.css'

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="terms-page home-page">
      <div className="terms-page-container">
        <article className="terms-content">
          <h1>Terms and Conditions</h1>
          <p className="terms-updated"><strong>Last updated: 15 August 2026</strong></p>

          <p>
            These Terms and Conditions (“Terms”) govern access to and use of the <strong>Opessocius mobile application</strong>, its software functionality, website pages relating to the Application, account features, Community, learning content, support functionality and related in-app features (collectively, the <strong>“App”</strong> or <strong>“Application”</strong>).
          </p>
          <p>
            The Application is operated by <strong>Nicolás De Rodrigo Fernández</strong>, an individual / sole operator trading under the name <strong>Opessocius</strong> (“Opessocius”, “we”, “us” or “our”).
          </p>
          <p>Please read these Terms carefully before creating an account or using the Application.</p>
          <p>
            By creating an account or using the Application after being given access to these Terms, you agree to these Terms.
          </p>
          <p>
            If you do not agree with these Terms, you should not create an account or continue using the Application.
          </p>

          <hr />

          <h2>1. Operator Information</h2>
          <p>The Application is operated by:</p>
          <p className="terms-address">
            <strong>Nicolás De Rodrigo Fernández</strong><br />
            Individual / Sole Operator<br />
            Trading as <strong>Opessocius</strong>
          </p>
          <p className="terms-address">
            Calle Jorge Juan 72<br />
            28009 Madrid<br />
            Madrid<br />
            Spain
          </p>
          <p><strong>NIF/NIE:</strong> 06609396R</p>
          <p>
            <strong>Telephone:</strong>{' '}
            <a href="tel:+34669887172">+34669887172</a>
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>
            <strong>Website:</strong>{' '}
            <a href="https://opessocius.com" target="_blank" rel="noopener noreferrer">https://opessocius.com</a>
          </p>
          <p>
            <strong>Privacy Policy:</strong>{' '}
            <a href="https://opessocius.com/privacy">https://opessocius.com/privacy</a>
          </p>
          <p>
            <strong>Support:</strong>{' '}
            <a href="https://opessocius.com/support">https://opessocius.com/support</a>
          </p>

          <hr />

          <h2>2. Scope of These Terms</h2>
          <p>
            These Terms apply specifically to the <strong>Opessocius software Application and its functionality</strong>.
          </p>
          <p>They govern matters including:</p>
          <ul>
            <li>creation and use of an Opessocius account;</li>
            <li>access to App features;</li>
            <li>Tracked Amounts;</li>
            <li>Allocations;</li>
            <li>Holdings;</li>
            <li>Allocation Plans;</li>
            <li>Activity;</li>
            <li>Allocation Requests;</li>
            <li>Community functionality;</li>
            <li>learning functionality;</li>
            <li>documents;</li>
            <li>notifications;</li>
            <li>consultations;</li>
            <li>support functionality;</li>
            <li>Opessocius+ access;</li>
            <li>other software features made available through the App.</li>
          </ul>
          <p>
            These Terms do not transform any informational record displayed by the Application into money, a financial asset, a bank account, a brokerage account or another financial product.
          </p>

          <hr />

          <h2>3. The Application Is Software</h2>
          <p><strong>Opessocius is a software application.</strong></p>
          <p>
            Its purpose is to provide private information display, numerical tracking, allocation tracking, record-keeping, visualization, communication, learning and administrative software functionality.
          </p>
          <p>The Application may allow Members to view or interact with:</p>
          <ul>
            <li>Tracked Amounts;</li>
            <li>Allocations;</li>
            <li>Holdings;</li>
            <li>Allocation Plans;</li>
            <li>Activity;</li>
            <li>historical numerical records;</li>
            <li>percentages;</li>
            <li>charts;</li>
            <li>reports;</li>
            <li>documents;</li>
            <li>Community content;</li>
            <li>learning content;</li>
            <li>Market Updates;</li>
            <li>notifications;</li>
            <li>consultations;</li>
            <li>support messages;</li>
            <li>other account information.</li>
          </ul>
          <p>
            The existence of numerical information or a currency symbol within the Application does not mean that money is stored, held or processed by the Application.
          </p>

          <hr />

          <h2>4. Eligibility</h2>
          <p>
            You must be <strong>18 years of age or older</strong> to create or maintain an Opessocius account.
          </p>
          <p>By creating an account, you represent that:</p>
          <ul>
            <li>you are at least 18 years old;</li>
            <li>you have legal capacity to agree to these Terms;</li>
            <li>the information you provide is accurate;</li>
            <li>you are creating the account for yourself unless expressly authorised otherwise;</li>
            <li>your use of the Application complies with applicable law.</li>
          </ul>
          <p>
            Opessocius may collect your date of birth as part of the account application process.
          </p>
          <p>
            Users who do not satisfy the age requirement are not permitted to maintain an account.
          </p>

          <hr />

          <h2>5. Member Accounts</h2>
          <p>
            A person who is granted access to applicable Opessocius functionality may be referred to as a <strong>Member</strong>.
          </p>
          <p>
            A Member account is a <strong>software user account</strong>.
          </p>
          <p>Creating or being approved for a Member account does not create:</p>
          <ul>
            <li>a bank account;</li>
            <li>a payment account;</li>
            <li>an electronic-money account;</li>
            <li>a brokerage account;</li>
            <li>a custody account;</li>
            <li>a securities account;</li>
            <li>a cryptocurrency account;</li>
            <li>an account containing money or financial assets.</li>
          </ul>
          <p>
            The Member designation relates only to access to the Application and applicable App features.
          </p>

          <hr />

          <h2>6. Account Application</h2>
          <p>
            Users may be required to complete an application before accessing the main App functionality.
          </p>
          <p>Information requested may include:</p>
          <ul>
            <li>first and last name;</li>
            <li>email address;</li>
            <li>password;</li>
            <li>date of birth;</li>
            <li>telephone number;</li>
            <li>country;</li>
            <li>residential address;</li>
            <li>allocation-related preferences;</li>
            <li>goals;</li>
            <li>time horizon;</li>
            <li>market-related experience;</li>
            <li>other account information.</li>
          </ul>
          <p>Applications may have statuses such as:</p>
          <ul>
            <li><strong>Application pending</strong>;</li>
            <li><strong>Active member</strong>;</li>
            <li><strong>Application denied</strong>.</li>
          </ul>
          <p>Applications are reviewed administratively.</p>
          <p>
            Approval means that the user has been granted access to relevant App functionality.
          </p>
          <p>
            It does <strong>not</strong> mean that a bank, brokerage, payment, custody or financial account has been opened.
          </p>

          <hr />

          <h2>7. Accurate Account Information</h2>
          <p>
            You must provide information that is accurate and complete to the best of your knowledge.
          </p>
          <p>You must not:</p>
          <ul>
            <li>impersonate another person;</li>
            <li>create an account using intentionally false information;</li>
            <li>knowingly provide fraudulent information;</li>
            <li>access another person&apos;s account without authorisation;</li>
            <li>create accounts for abusive or unlawful purposes.</li>
          </ul>
          <p>
            You should update information where functionality allowing updates is available or contact support where a correction is required.
          </p>

          <hr />

          <h2>8. Account Security</h2>
          <p>
            You are responsible for taking reasonable steps to protect your login credentials.
          </p>
          <p>You should:</p>
          <ul>
            <li>use a secure password;</li>
            <li>keep your password confidential;</li>
            <li>avoid sharing account access;</li>
            <li>protect devices on which you remain signed in;</li>
            <li>notify Opessocius if you reasonably believe your account has been compromised.</li>
          </ul>
          <p>
            The Application may use security mechanisms including authentication, rate limiting and abuse-prevention controls.
          </p>

          <hr />

          <h2>9. Tracked Amount</h2>
          <p>
            The Application may display a <strong>Tracked Amount</strong> associated with a Member account.
          </p>
          <p>
            A Tracked Amount is a numerical database record used by the Application for information display, organization, calculations and related App functionality.
          </p>
          <p>A Tracked Amount is <strong>not</strong>:</p>
          <ul>
            <li>money stored inside Opessocius;</li>
            <li>money held by Opessocius;</li>
            <li>a bank balance;</li>
            <li>an electronic-money balance;</li>
            <li>a brokerage balance;</li>
            <li>a payment-account balance;</li>
            <li>a custodial balance;</li>
            <li>money that can be spent through the Application;</li>
            <li>money that can be withdrawn from the Application.</li>
          </ul>
          <p>
            A currency symbol or monetary unit may be used to provide a convenient numerical reference.
          </p>
          <p>
            Its appearance does not mean that the corresponding amount is held, possessed, controlled or custodied by the Application.
          </p>

          <hr />

          <h2>10. Allocations</h2>
          <p>
            The Application may allow Members to create, view, organise or request changes to <strong>Allocations</strong>.
          </p>
          <p>An Allocation is an informational record within the Application.</p>
          <p>Available actions may include:</p>
          <ul>
            <li><strong>Add allocation</strong>;</li>
            <li><strong>Reduce allocation</strong>;</li>
            <li><strong>Reallocate</strong>;</li>
            <li>view <strong>Holdings</strong>;</li>
            <li>view an <strong>Allocation Plan</strong>;</li>
            <li>review <strong>Activity</strong>.</li>
          </ul>
          <p>These actions relate to App records.</p>
          <p>They do not themselves transfer money or financial assets.</p>

          <hr />

          <h2>11. Add Allocation</h2>
          <p>
            <strong>Add allocation</strong> allows a numerical allocation record to be added or allows a Member to submit an <strong>Add allocation request</strong>.
          </p>
          <p>
            When a Member selects Add allocation, the Application may create an administrative request or update an informational record following applicable review.
          </p>
          <p>Add allocation does <strong>not</strong> itself:</p>
          <ul>
            <li>deposit money;</li>
            <li>debit a bank account;</li>
            <li>transfer money to Opessocius;</li>
            <li>transfer an asset;</li>
            <li>create a payment;</li>
            <li>fund a financial account;</li>
            <li>execute a transaction outside the Application.</li>
          </ul>
          <p>
            An <strong>Add allocation requested</strong> status means that a software request has been recorded for applicable administrative review.
          </p>

          <hr />

          <h2>12. Reduce Allocation</h2>
          <p>
            <strong>Reduce allocation</strong> allows a Member to request a reduction of an informational Allocation.
          </p>
          <p>A Reduce allocation request does <strong>not</strong> itself:</p>
          <ul>
            <li>withdraw money;</li>
            <li>cause money to be paid to a Member;</li>
            <li>instruct a bank;</li>
            <li>instruct a broker;</li>
            <li>sell an asset;</li>
            <li>transfer ownership of an asset;</li>
            <li>execute a payment.</li>
          </ul>
          <p>It creates or modifies an internal software record.</p>

          <hr />

          <h2>13. Reallocate</h2>
          <p>
            <strong>Reallocate</strong> allows a Member to request or record a change in how numerical Allocations are organised within the Application.
          </p>
          <p>Reallocate does <strong>not</strong> itself:</p>
          <ul>
            <li>send money;</li>
            <li>receive money;</li>
            <li>transfer money;</li>
            <li>execute a bank transfer;</li>
            <li>move money between bank accounts;</li>
            <li>move money between brokerage accounts;</li>
            <li>buy or sell an asset;</li>
            <li>execute a trade.</li>
          </ul>
          <p>It relates to how internal App records are organised.</p>

          <hr />

          <h2>14. Allocation Requests</h2>
          <p>
            The Application may allow Members to submit <strong>Allocation Requests</strong>.
          </p>
          <p>These may include:</p>
          <ul>
            <li>Add allocation requests;</li>
            <li>Reduce allocation requests;</li>
            <li>Reallocate requests.</li>
          </ul>
          <p>An Allocation Request may have statuses such as:</p>
          <ul>
            <li>pending;</li>
            <li>under review;</li>
            <li>approved;</li>
            <li>denied;</li>
            <li>cancelled;</li>
            <li>completed.</li>
          </ul>
          <p>
            Approval or completion means that the relevant <strong>Application record</strong> has been processed or updated.
          </p>
          <p>
            It does not mean that Opessocius has executed a real-world financial transaction.
          </p>

          <hr />

          <h2>15. Activity</h2>
          <p>
            The <strong>Activity</strong> section provides a record of applicable changes, requests or entries recorded within the Application.
          </p>
          <p>Activity may include terms such as:</p>
          <ul>
            <li>Add entry;</li>
            <li>Remove entry;</li>
            <li>Allocation recorded;</li>
            <li>Reallocate;</li>
            <li>No allocation change.</li>
          </ul>
          <p>
            These entries are software/database records.
          </p>
          <p>
            They are not bank statements and are not intended to represent payment-processing records generated by a bank, payment institution or brokerage.
          </p>

          <hr />

          <h2>16. Add Entry and Remove Entry</h2>
          <p>
            An <strong>Add entry</strong> records an increase in an applicable numerical record.
          </p>
          <p>
            A <strong>Remove entry</strong> records a reduction in an applicable numerical record.
          </p>
          <p>
            Neither action, by itself, causes money or assets to enter or leave the Application.
          </p>
          <p>
            They describe changes to information stored or displayed by the software.
          </p>

          <hr />

          <h2>17. Holdings</h2>
          <p>
            The Application may organise information into categories called <strong>Holdings</strong>.
          </p>
          <p>A Holding is an organisational feature of the software.</p>
          <p>
            Use of the word “Holding” does not mean that Opessocius has legal possession or custody of a corresponding asset.
          </p>
          <p>
            Holdings are used to organise information displayed to a Member.
          </p>

          <hr />

          <h2>18. Allocation Plan</h2>
          <p>
            The Application may display an <strong>Allocation Plan</strong>.
          </p>
          <p>
            An Allocation Plan is a software representation of how certain tracked numerical information is organised.
          </p>
          <p>An Allocation Plan is not:</p>
          <ul>
            <li>a bank account;</li>
            <li>a payment account;</li>
            <li>a brokerage account;</li>
            <li>a custodial account;</li>
            <li>a financial product;</li>
            <li>money held by Opessocius.</li>
          </ul>
          <p>
            An Allocation Plan may change as information within the Application is updated.
          </p>

          <hr />

          <h2>19. Allocation Goals</h2>
          <p>
            Members may be able to record an <strong>Allocation Goal</strong> or information describing what they would like their plan to achieve.
          </p>
          <p>Allocation Goals are informational records.</p>
          <p>
            They are not guarantees or contractual promises that a particular numerical result will occur.
          </p>

          <hr />

          <h2>20. No Money Passes Through the Application</h2>
          <p>For the avoidance of doubt:</p>
          <p>
            <strong>No money passes through the Opessocius Application.</strong>
          </p>
          <p>
            The Application does not provide functionality that receives, holds, custodies, transmits or distributes user money.
          </p>
          <p>The Application itself does not enable a Member to:</p>
          <ul>
            <li>deposit money;</li>
            <li>withdraw money;</li>
            <li>send money;</li>
            <li>receive money;</li>
            <li>transfer money;</li>
            <li>fund a bank or brokerage account;</li>
            <li>execute a payment;</li>
            <li>purchase an asset;</li>
            <li>sell an asset;</li>
            <li>execute a trade;</li>
            <li>transfer cryptocurrency.</li>
          </ul>
          <p>A Tracked Amount remains a numerical App record.</p>
          <p>It is not money stored in Opessocius.</p>

          <hr />

          <h2>21. No Bank, Broker or Wallet Connection</h2>
          <p>
            The current Application does not connect a Member account to the Member&apos;s:
          </p>
          <ul>
            <li>bank account;</li>
            <li>brokerage account;</li>
            <li>payment account;</li>
            <li>cryptocurrency wallet;</li>
            <li>cryptocurrency exchange.</li>
          </ul>
          <p>
            The Application does not require online-banking credentials or brokerage credentials to provide its allocation-tracking functionality.
          </p>

          <hr />

          <h2>22. No Payment Processing for Allocation Features</h2>
          <p>
            Add allocation, Reduce allocation and Reallocate are not payment-processing functions.
          </p>
          <p>
            These functions do not use a payment processor to transfer user funds.
          </p>
          <p>
            The Application does not currently use Stripe, PayPal, Apple Pay or another payment processor to execute these Allocation actions.
          </p>

          <hr />

          <h2>23. Separation of App Records and External Assets</h2>
          <p>
            Information stored or displayed by Opessocius exists within the Application&apos;s database and user interface.
          </p>
          <p>A database record is not itself money or an external asset.</p>
          <p>
            Changing an App record does not, merely because the record changes:
          </p>
          <ul>
            <li>move external money;</li>
            <li>create a payment;</li>
            <li>transfer legal ownership;</li>
            <li>debit or credit a bank account;</li>
            <li>execute a brokerage transaction.</li>
          </ul>
          <p>
            The Application and its internal records should therefore be distinguished from any independently existing real-world asset, account or arrangement.
          </p>

          <hr />

          <h2>24. Separation From External Arrangements</h2>
          <p>
            These Terms govern <strong>only the Opessocius Application and its software functionality</strong>.
          </p>
          <p>
            The Application does not itself create or execute an external banking, brokerage, custody, payment or asset-transfer arrangement.
          </p>
          <p>
            If a Member separately enters into an agreement or arrangement outside the Application, that external arrangement is distinct from the software functionality governed by these Terms and must be assessed according to its own applicable documentation and legal terms.
          </p>
          <p>
            The existence of an external arrangement does not transform a Tracked Amount or Allocation displayed inside the Application into money held by the App.
          </p>
          <p>
            Similarly, the Application does not execute an external arrangement merely because information relating to it may be recorded for reference.
          </p>

          <hr />

          <h2>25. Market Updates</h2>
          <p>
            The Application may provide <strong>Market Updates</strong>.
          </p>
          <p>Market Updates may contain:</p>
          <ul>
            <li>general market information;</li>
            <li>educational material;</li>
            <li>charts;</li>
            <li>publicly available information;</li>
            <li>news;</li>
            <li>commentary;</li>
            <li>videos;</li>
            <li>other informational content.</li>
          </ul>
          <p>
            Market Updates are provided as general informational or educational content.
          </p>
          <p>Viewing Market Updates does not cause the Application to:</p>
          <ul>
            <li>purchase an asset;</li>
            <li>sell an asset;</li>
            <li>execute a trade;</li>
            <li>open or close a position;</li>
            <li>transfer money;</li>
            <li>connect to a broker.</li>
          </ul>

          <hr />

          <h2>26. No Personalised Transaction Execution</h2>
          <p>
            The Application does not independently execute transactions based on information displayed within it.
          </p>
          <p>
            Nothing in a Market Update, notification, chart, Community message or learning item gives the App technical authority to move money or execute a transaction for a Member.
          </p>
          <p>
            General content should not be treated as a substitute for professional legal or tax advice.
          </p>
          <p>
            Where a Member requires professional advice regarding their individual circumstances, they should consult an appropriately qualified professional.
          </p>

          <hr />

          <h2>27. Informational Accuracy</h2>
          <p>We aim to present App information accurately.</p>
          <p>However, information may occasionally be:</p>
          <ul>
            <li>delayed;</li>
            <li>incomplete;</li>
            <li>temporarily unavailable;</li>
            <li>affected by an input error;</li>
            <li>affected by a calculation or synchronization issue;</li>
            <li>dependent on third-party information.</li>
          </ul>
          <p>
            If you identify information that you believe is incorrect, you should contact support.
          </p>
          <p>
            Where numerical information is important to you, you should not assume that an App display is an independent verification of an external fact.
          </p>

          <hr />

          <h2>28. Calculations and Percentages</h2>
          <p>The Application may calculate or display:</p>
          <ul>
            <li>percentages;</li>
            <li>differences between values;</li>
            <li>historical changes;</li>
            <li>averages;</li>
            <li>ratios;</li>
            <li>statistical measures;</li>
            <li>graphical representations.</li>
          </ul>
          <p>These are software-generated informational outputs.</p>
          <p>They do not themselves:</p>
          <ul>
            <li>create money;</li>
            <li>create an asset;</li>
            <li>generate a payment;</li>
            <li>transfer ownership;</li>
            <li>guarantee a future result;</li>
            <li>create a right to withdraw a displayed amount from the Application.</li>
          </ul>

          <hr />

          <h2>29. Historical Information</h2>
          <p>
            Historical information displayed within the App reflects information recorded in the Application.
          </p>
          <p>
            Past numerical changes or historical records do not guarantee future numerical outcomes.
          </p>
          <p>
            The availability of historical information also does not mean that Opessocius possesses the corresponding amount as money or assets.
          </p>

          <hr />

          <h2>30. Opessocius+</h2>
          <p>
            Certain App functionality may require <strong>Opessocius+ access</strong>.
          </p>
          <p>The Application may display language including:</p>
          <ul>
            <li>Request Opessocius+ access;</li>
            <li>Explore Opessocius+;</li>
            <li>Opessocius+ is active;</li>
            <li>Opessocius+ access required.</li>
          </ul>
          <p>
            An Opessocius+ request is a request for access to additional <strong>App features or content</strong>.
          </p>
          <p>
            It is not an application for a bank account, investment account, payment account or other financial product.
          </p>
          <p>
            The current App does not contain a payment checkout for Opessocius+.
          </p>
          <p>
            If paid digital functionality is introduced in a future version, applicable terms and any required App Store purchasing mechanisms will be addressed separately.
          </p>

          <hr />

          <h2>31. Learning Content</h2>
          <p>
            The Application may provide educational or learning content.
          </p>
          <p>This may include:</p>
          <ul>
            <li>lessons;</li>
            <li>videos;</li>
            <li>written explanations;</li>
            <li>general market information;</li>
            <li>learning progress;</li>
            <li>other educational material.</li>
          </ul>
          <p>
            Learning content is intended for educational and informational use.
          </p>
          <p>
            We may record lesson or module completion to allow Members to track their learning progress.
          </p>

          <hr />

          <h2>32. Community</h2>
          <p>
            Eligible Members may have access to Community functionality.
          </p>
          <p>
            Community functionality allows users to communicate or share permitted content.
          </p>
          <p>You agree to use the Community responsibly.</p>
          <p>You must not submit content that:</p>
          <ul>
            <li>is unlawful;</li>
            <li>contains credible threats of violence;</li>
            <li>harasses or bullies another person;</li>
            <li>promotes hatred against protected groups;</li>
            <li>is defamatory;</li>
            <li>is intentionally fraudulent;</li>
            <li>exploits or endangers minors;</li>
            <li>contains unlawful sexually explicit material;</li>
            <li>encourages self-harm;</li>
            <li>promotes terrorism or violent extremist activity;</li>
            <li>facilitates serious illegal activity;</li>
            <li>infringes intellectual-property rights;</li>
            <li>exposes another person&apos;s private information without authority;</li>
            <li>contains malicious code;</li>
            <li>constitutes spam;</li>
            <li>impersonates another person;</li>
            <li>deliberately circumvents moderation controls;</li>
            <li>materially disrupts the Community.</li>
          </ul>

          <hr />

          <h2>33. Community Moderation</h2>
          <p>Opessocius may moderate Community content.</p>
          <p>Moderation mechanisms may include:</p>
          <ul>
            <li>prohibited-term filtering;</li>
            <li>user reports;</li>
            <li>blocking;</li>
            <li>rate limits;</li>
            <li>human review;</li>
            <li>content removal;</li>
            <li>warnings;</li>
            <li>temporary restrictions;</li>
            <li>loss of Community access;</li>
            <li>account restrictions in serious cases.</li>
          </ul>
          <p>
            We may remove or restrict content where we reasonably believe it violates these Terms, applicable law or user-safety requirements.
          </p>

          <hr />

          <h2>34. Reporting Content</h2>
          <p>
            Members may use available reporting functionality to report objectionable Community content.
          </p>
          <p>Reports may be reviewed by an administrator.</p>
          <p>You may also report concerns through:</p>
          <p>
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>Reports must be made in good faith.</p>
          <p>
            Abusing the reporting system to target or harass another Member may itself violate these Terms.
          </p>

          <hr />

          <h2>35. Blocking Members</h2>
          <p>
            Where blocking functionality is available, Members may block another Member.
          </p>
          <p>
            Blocking may prevent or limit further Community interaction with the blocked Member according to the functionality implemented in the App.
          </p>
          <p>
            Blocking does not prevent Opessocius from separately reviewing reported conduct.
          </p>

          <hr />

          <h2>36. User Content</h2>
          <p>
            You retain your rights in original content you submit to the Application.
          </p>
          <p>
            By submitting content where storage, display or processing is necessary for App functionality, you grant Opessocius a limited, non-exclusive, royalty-free licence to:
          </p>
          <ul>
            <li>host;</li>
            <li>store;</li>
            <li>technically process;</li>
            <li>reproduce where necessary for App display;</li>
            <li>display to intended recipients;</li>
            <li>moderate;</li>
            <li>format;</li>
            <li>remove where permitted under these Terms;</li>
          </ul>
          <p>
            that content solely as reasonably necessary to operate and protect the Application.
          </p>
          <p>
            You must have the necessary rights to submit content that you provide.
          </p>

          <hr />

          <h2>37. Profile Photos and Uploaded Files</h2>
          <p>
            Where enabled, Members may upload a profile photograph or interact with private documents made available through the App.
          </p>
          <p>You must not upload:</p>
          <ul>
            <li>unlawful material;</li>
            <li>malicious files;</li>
            <li>material that infringes another person&apos;s rights;</li>
            <li>content that you do not have authority to provide.</li>
          </ul>
          <p>
            Permissions relating to your camera or photo library can be controlled through your device settings.
          </p>

          <hr />

          <h2>38. Private Documents</h2>
          <p>
            The Application may make documents available to a particular Member.
          </p>
          <p>
            Private documents are intended for the Member account to which they are provided.
          </p>
          <p>
            Unless expressly authorised, Members must not attempt to access documents belonging to another account.
          </p>

          <hr />

          <h2>39. Support</h2>
          <p>The App may provide support through:</p>
          <ul>
            <li>in-app messaging;</li>
            <li>email;</li>
            <li>the Support page.</li>
          </ul>
          <p>Support contact:</p>
          <p>
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>Support page:</p>
          <p>
            <a href="https://opessocius.com/support">https://opessocius.com/support</a>
          </p>
          <p>
            Support functionality must not be used for harassment, spam, abusive communications or unlawful activity.
          </p>

          <hr />

          <h2>40. Consultations</h2>
          <p>
            The Application may provide functionality for requesting or scheduling <strong>Consultations</strong>.
          </p>
          <p>Consultations may include:</p>
          <ul>
            <li>requested times;</li>
            <li>confirmed times;</li>
            <li>agendas;</li>
            <li>meeting links;</li>
            <li>rescheduling;</li>
            <li>cancellation.</li>
          </ul>
          <p>Availability is not guaranteed.</p>
          <p>
            An external meeting platform such as Google Meet may be used.
          </p>
          <p>
            A Consultation does not, merely because it is booked through the Application, create a banking, brokerage, custody or fiduciary relationship.
          </p>

          <hr />

          <h2>41. Notifications</h2>
          <p>Members may choose to enable push notifications.</p>
          <p>Notifications may relate to:</p>
          <ul>
            <li>account updates;</li>
            <li>App inbox information;</li>
            <li>Market Updates where enabled;</li>
            <li>consultations;</li>
            <li>support;</li>
            <li>other App functionality.</li>
          </ul>
          <p>Notification delivery may depend on:</p>
          <ul>
            <li>device settings;</li>
            <li>Internet connectivity;</li>
            <li>Apple;</li>
            <li>Expo;</li>
            <li>operating-system restrictions;</li>
            <li>other technical infrastructure.</li>
          </ul>
          <p>
            Push notifications should therefore not be treated as guaranteed delivery of time-sensitive information.
          </p>
          <p>
            Members can disable push notifications through their device settings.
          </p>

          <hr />

          <h2>42. Third-Party Platforms and Content</h2>
          <p>
            The Application may display or link to content from third parties.
          </p>
          <p>
            Depending on the relevant App feature, these may include platforms such as:
          </p>
          <ul>
            <li>TradingView;</li>
            <li>YouTube;</li>
            <li>Google Meet;</li>
            <li>Unsplash;</li>
            <li>external market-information websites.</li>
          </ul>
          <p>Third-party platforms are independent from Opessocius.</p>
          <p>
            Their availability, content, privacy practices and terms are controlled by the relevant third party.
          </p>
          <p>
            You must comply with applicable third-party terms when accessing those platforms.
          </p>

          <hr />

          <h2>43. Intellectual Property</h2>
          <p>
            Except for User Content and third-party material, the Application and its original components may contain intellectual property owned by or licensed to Opessocius.
          </p>
          <p>This may include:</p>
          <ul>
            <li>software;</li>
            <li>interfaces;</li>
            <li>visual design;</li>
            <li>logos;</li>
            <li>branding;</li>
            <li>graphics;</li>
            <li>original text;</li>
            <li>original educational content;</li>
            <li>reports;</li>
            <li>databases;</li>
            <li>documentation.</li>
          </ul>
          <p>
            These Terms do not transfer ownership of that intellectual property to Members.
          </p>
          <p>
            Except where applicable law expressly permits otherwise, you may not:
          </p>
          <ul>
            <li>reproduce substantial portions of the App;</li>
            <li>distribute App software;</li>
            <li>resell App content;</li>
            <li>commercially exploit proprietary content;</li>
            <li>bypass technical protections;</li>
            <li>reverse engineer protected software;</li>
            <li>create unauthorised derivative versions.</li>
          </ul>

          <hr />

          <h2>44. Licence to Use the App</h2>
          <p>
            Subject to these Terms and applicable App Store rules, Opessocius permits you to use the Application for your personal, lawful use on supported devices.
          </p>
          <p>This permission is:</p>
          <ul>
            <li>limited;</li>
            <li>non-exclusive;</li>
            <li>non-transferable except where applicable platform rules permit otherwise;</li>
            <li>revocable where these Terms are materially breached.</li>
          </ul>
          <p>
            You do not acquire ownership of the Application software.
          </p>

          <hr />

          <h2>45. Apple App Store</h2>
          <p>
            Where Opessocius is downloaded through Apple&apos;s App Store, Apple&apos;s applicable App Store terms also apply to the distribution and software licence.
          </p>
          <p>
            Unless Opessocius provides a Custom EULA through App Store Connect, Apple&apos;s Standard End User License Agreement applies to the licence of the iOS Application.
          </p>
          <p>
            These Terms primarily govern your Opessocius account and your use of Opessocius App functionality.
          </p>
          <p>
            Nothing in these Terms is intended to override mandatory terms imposed by Apple for App Store distribution.
          </p>

          <hr />

          <h2>46. Prohibited Conduct</h2>
          <p>You must not:</p>
          <ul>
            <li>use the App for unlawful activity;</li>
            <li>gain or attempt to gain unauthorised access;</li>
            <li>circumvent authentication;</li>
            <li>circumvent security controls;</li>
            <li>abuse account-creation functionality;</li>
            <li>impersonate another person;</li>
            <li>manipulate another Member&apos;s records;</li>
            <li>interfere with App infrastructure;</li>
            <li>intentionally overload backend systems;</li>
            <li>distribute malware;</li>
            <li>exploit security vulnerabilities;</li>
            <li>abuse password-reset functionality;</li>
            <li>abuse support functionality;</li>
            <li>scrape protected information unlawfully;</li>
            <li>bypass Community moderation;</li>
            <li>evade restrictions by creating additional accounts;</li>
            <li>use automated mechanisms to disrupt the App;</li>
            <li>submit fraudulent information.</li>
          </ul>

          <hr />

          <h2>47. Security Measures</h2>
          <p>
            Opessocius may use technical controls intended to protect accounts and App infrastructure.
          </p>
          <p>These may include:</p>
          <ul>
            <li>authentication;</li>
            <li>access controls;</li>
            <li>database rules;</li>
            <li>storage rules;</li>
            <li>secure network communication;</li>
            <li>rate limiting;</li>
            <li>security-event monitoring;</li>
            <li>administrative permissions;</li>
            <li>other reasonable security mechanisms.</li>
          </ul>
          <p>
            No Internet-connected application can guarantee absolute security.
          </p>

          <hr />

          <h2>48. Suspension and Restrictions</h2>
          <p>
            We may restrict access to particular App functionality where reasonably necessary because of:
          </p>
          <ul>
            <li>material violation of these Terms;</li>
            <li>fraudulent activity;</li>
            <li>security risk;</li>
            <li>unlawful conduct;</li>
            <li>serious Community abuse;</li>
            <li>attempts to compromise App infrastructure;</li>
            <li>legal requirements;</li>
            <li>protection of other Members.</li>
          </ul>
          <p>
            Where appropriate, a restriction may apply only to the affected feature rather than the entire account.
          </p>
          <p>
            Nothing in this section limits mandatory rights available under applicable law.
          </p>

          <hr />

          <h2>49. Ending Your Use of the Application</h2>
          <p>You may stop using the Application at any time.</p>
          <p>
            You may also request deletion of your account using the account-deletion functionality described below.
          </p>
          <p>
            We will not impose an unreasonable obstacle to the exercise of a legally available right to end your use of the App.
          </p>

          <hr />

          <h2>50. Account Deletion</h2>
          <p>
            Every user who has created an Opessocius account can initiate account deletion from within the Application.
          </p>
          <p>This includes:</p>
          <ul>
            <li>approved Members;</li>
            <li>pending applicants;</li>
            <li>denied applicants.</li>
          </ul>

          <h3>Approved Members</h3>
          <p>Navigate to:</p>
          <p><strong>Profile → Settings → Delete account</strong></p>

          <h3>Pending applicants</h3>
          <p>Use:</p>
          <p><strong>Pending Approval → Delete account</strong></p>

          <h3>Denied applicants</h3>
          <p>Sign in and use:</p>
          <p><strong>Denied Access → Delete account</strong></p>

          <p>
            When you select <strong>Request account deletion</strong>, the Application creates an account-deletion request.
          </p>
          <p>
            Deletion normally completes within <strong>30 days</strong>.
          </p>
          <p>Administrative completion may be required.</p>
          <p>
            Users do not need to contact support merely to initiate account deletion.
          </p>
          <p>
            When deletion is completed, the Firebase Authentication account and associated information covered by the deletion process are removed, except for information that may lawfully or technically remain for limited purposes as explained in the Privacy Policy.
          </p>
          <p>More information:</p>
          <p>
            <a href="https://opessocius.com/privacy">https://opessocius.com/privacy</a>
          </p>

          <hr />

          <h2>51. Availability of the Application</h2>
          <p>We aim to keep the Application functioning reliably.</p>
          <p>
            However, we cannot guarantee continuous or uninterrupted availability.
          </p>
          <p>App functionality may occasionally be affected by:</p>
          <ul>
            <li>maintenance;</li>
            <li>software updates;</li>
            <li>security work;</li>
            <li>Internet failures;</li>
            <li>cloud infrastructure failures;</li>
            <li>third-party platform outages;</li>
            <li>Apple infrastructure;</li>
            <li>Expo infrastructure;</li>
            <li>Firebase infrastructure;</li>
            <li>device compatibility;</li>
            <li>circumstances outside our reasonable control.</li>
          </ul>
          <p>
            Nothing in this section limits rights that cannot lawfully be excluded.
          </p>

          <hr />

          <h2>52. Changes to App Functionality</h2>
          <p>The Application may evolve over time.</p>
          <p>We may:</p>
          <ul>
            <li>add features;</li>
            <li>improve features;</li>
            <li>change interfaces;</li>
            <li>remove obsolete functionality;</li>
            <li>replace technical providers;</li>
            <li>modify security measures;</li>
            <li>discontinue functionality.</li>
          </ul>
          <p>
            Where a change materially affects legal rights and applicable law requires notice, appropriate notice will be provided.
          </p>

          <hr />

          <h2>53. App Updates</h2>
          <p>Updates may be released for:</p>
          <ul>
            <li>security;</li>
            <li>reliability;</li>
            <li>compatibility;</li>
            <li>functionality;</li>
            <li>legal compliance.</li>
          </ul>
          <p>
            Certain features may eventually require a supported App version.
          </p>
          <p>You are encouraged to keep Opessocius updated.</p>

          <hr />

          <h2>54. Privacy</h2>
          <p>
            Personal data processed through the Application is governed by the <strong>Opessocius Privacy Policy</strong>:
          </p>
          <p>
            <a href="https://opessocius.com/privacy">https://opessocius.com/privacy</a>
          </p>
          <p>The Privacy Policy explains, among other matters:</p>
          <ul>
            <li>categories of personal data processed;</li>
            <li>purposes of processing;</li>
            <li>third-party processors;</li>
            <li>retention;</li>
            <li>account deletion;</li>
            <li>privacy rights;</li>
            <li>international data transfers.</li>
          </ul>

          <hr />

          <h2>55. No Sale of Member Accounts</h2>
          <p>A Member account is personal to the registered user.</p>
          <p>
            You must not sell, rent, transfer or commercially provide access to your account to another person.
          </p>

          <hr />

          <h2>56. No Guarantee of Specific App Outcomes</h2>
          <p>
            The Application provides software functionality for tracking and displaying information.
          </p>
          <p>We do not guarantee:</p>
          <ul>
            <li>that a Member will achieve a particular Allocation Goal;</li>
            <li>that a Tracked Amount will reach a particular value;</li>
            <li>a particular numerical outcome;</li>
            <li>uninterrupted access;</li>
            <li>that all third-party information will always be accurate;</li>
            <li>that every feature will remain permanently unchanged.</li>
          </ul>
          <p>
            Nothing displayed as a goal, historical value, percentage or other numerical measure should be interpreted as a guarantee.
          </p>

          <hr />

          <h2>57. Liability and Mandatory Rights</h2>
          <p>
            Nothing in these Terms excludes or limits liability where doing so would be unlawful.
          </p>
          <p>
            Nothing in these Terms excludes mandatory rights available to consumers under applicable Spanish or European Union law.
          </p>
          <p>
            Subject to those mandatory rights, Opessocius is not responsible for loss caused exclusively by:
          </p>
          <ul>
            <li>unlawful or unauthorised use of the Application;</li>
            <li>false information intentionally provided by a user;</li>
            <li>a Member failing to reasonably protect their credentials;</li>
            <li>third-party platform failures outside our reasonable control;</li>
            <li>use of third-party information contrary to its intended informational purpose;</li>
            <li>circumstances outside our reasonable control.</li>
          </ul>
          <p>
            Any exclusion or limitation applies only to the extent permitted by applicable law.
          </p>

          <hr />

          <h2>58. Consumer Rights</h2>
          <p>
            If you qualify as a consumer, you retain all mandatory protections provided by applicable consumer law.
          </p>
          <p>
            Nothing in these Terms requires you to waive a mandatory legal right.
          </p>
          <p>
            If any part of these Terms conflicts with a mandatory consumer-protection rule applicable to you, the mandatory legal rule prevails to the extent of that conflict.
          </p>

          <hr />

          <h2>59. Communications</h2>
          <p>We may communicate with you regarding:</p>
          <ul>
            <li>account administration;</li>
            <li>security;</li>
            <li>support;</li>
            <li>consultations;</li>
            <li>account deletion;</li>
            <li>important App changes;</li>
            <li>changes to these Terms;</li>
            <li>privacy matters;</li>
            <li>other operational App matters.</li>
          </ul>
          <p>Communications may be delivered through:</p>
          <ul>
            <li>email;</li>
            <li>in-app messages;</li>
            <li>push notifications where enabled.</li>
          </ul>

          <hr />

          <h2>60. Changes to These Terms</h2>
          <p>
            We may update these Terms where reasonably necessary because of:
          </p>
          <ul>
            <li>App changes;</li>
            <li>new functionality;</li>
            <li>legal requirements;</li>
            <li>security requirements;</li>
            <li>technical changes;</li>
            <li>changes in third-party infrastructure.</li>
          </ul>
          <p>
            The <strong>Last updated</strong> date will be changed when the Terms are revised.
          </p>
          <p>
            Where a material change requires additional notice or renewed agreement under applicable law, we will provide that notice or request agreement as appropriate.
          </p>

          <hr />

          <h2>61. Severability</h2>
          <p>
            If a court or competent authority determines that a provision of these Terms is invalid or unenforceable, the remaining provisions remain effective to the extent legally possible.
          </p>
          <p>
            Any invalid provision will be limited or interpreted only to the extent necessary to comply with applicable law.
          </p>

          <hr />

          <h2>62. No Waiver</h2>
          <p>
            Failure to immediately enforce a provision of these Terms does not necessarily constitute a waiver of the relevant right.
          </p>

          <hr />

          <h2>63. Governing Law</h2>
          <p>
            These Terms are governed by the laws of <strong>Spain</strong>, without depriving consumers of mandatory protections that may apply under the law applicable to them.
          </p>

          <hr />

          <h2>64. Courts and Disputes</h2>
          <p>
            If you have a concern, we encourage you to contact us first so that we can attempt to resolve it.
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>
            Where the law permits jurisdiction to be agreed, disputes may be submitted to the competent courts of Madrid, Spain.
          </p>
          <p>
            However, if you are a consumer, nothing in these Terms requires you to bring proceedings in Madrid where mandatory law entitles you to use another competent court, including a court corresponding to your place of residence where applicable.
          </p>
          <p>
            Nothing limits your right to contact a competent consumer authority, regulatory authority or court.
          </p>

          <hr />

          <h2>65. Legal Requests</h2>
          <p>We may comply with valid and binding requests from competent:</p>
          <ul>
            <li>courts;</li>
            <li>law-enforcement authorities;</li>
            <li>administrative authorities;</li>
            <li>regulators;</li>
          </ul>
          <p>where required by applicable law.</p>
          <p>
            Personal data processed in connection with such requests will be handled in accordance with applicable law and the Privacy Policy.
          </p>

          <hr />

          <h2>66. Entire App Agreement</h2>
          <p>
            These Terms and documents expressly incorporated into them constitute the general agreement governing use of the Opessocius Application.
          </p>
          <p>Relevant documents include:</p>
          <ul>
            <li>these Terms and Conditions;</li>
            <li>the Privacy Policy;</li>
            <li>applicable Community rules;</li>
            <li>specific terms expressly presented for a particular App feature.</li>
          </ul>
          <p>
            These Terms apply only to the Application and should not be interpreted as automatically incorporating a separate external agreement that is not expressly made part of the App agreement.
          </p>

          <hr />

          <h2>67. Contact</h2>
          <p>
            Questions, complaints or claims regarding the Application or these Terms may be directed to:
          </p>
          <p className="terms-address">
            <strong>Nicolás De Rodrigo Fernández</strong><br />
            Individual / Sole Operator<br />
            Trading as <strong>Opessocius</strong>
          </p>
          <p className="terms-address">
            Calle Jorge Juan 72<br />
            28009 Madrid<br />
            Madrid<br />
            Spain
          </p>
          <p><strong>NIF/NIE:</strong> 06609396R</p>
          <p>
            <strong>Telephone:</strong>{' '}
            <a href="tel:+34669887172">+34669887172</a>
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:relations@opessocius.support">relations@opessocius.support</a>
          </p>
          <p>
            <strong>Website:</strong>{' '}
            <a href="https://opessocius.com" target="_blank" rel="noopener noreferrer">https://opessocius.com</a>
          </p>
          <p>
            <strong>Support:</strong>{' '}
            <a href="https://opessocius.com/support">https://opessocius.com/support</a>
          </p>
          <p>
            <strong>Privacy:</strong>{' '}
            <a href="https://opessocius.com/privacy">https://opessocius.com/privacy</a>
          </p>

          <hr />

          <h2>68. Final Clarification About the Application</h2>
          <p>For the avoidance of doubt:</p>
          <p><strong>Opessocius is a software application.</strong></p>
          <p><strong>A Member account is a software user account.</strong></p>
          <p><strong>A Tracked Amount is a numerical application record.</strong></p>
          <p><strong>An Allocation is an informational application record.</strong></p>
          <p>
            <strong>Add allocation creates or modifies an internal record or request. It does not deposit money.</strong>
          </p>
          <p>
            <strong>Reduce allocation creates or modifies an internal record or request. It does not withdraw money.</strong>
          </p>
          <p>
            <strong>Reallocate changes or requests a change to the organisation of internal records. It does not transfer money.</strong>
          </p>
          <p><strong>Activity is a record of activity within the software.</strong></p>
          <p>
            <strong>Holdings are organisational categories within the software and do not indicate custody by Opessocius.</strong>
          </p>
          <p><strong>An Allocation Plan is an informational software feature.</strong></p>
          <p><strong>No money is stored in an Opessocius account.</strong></p>
          <p><strong>No money passes through the Application.</strong></p>
          <p><strong>No money can be deposited into the Application.</strong></p>
          <p><strong>No money can be withdrawn from the Application.</strong></p>
          <p><strong>No money can be transferred through the Application.</strong></p>
          <p>
            <strong>The Application does not execute trades or external financial transactions.</strong>
          </p>
          <p>
            <strong>The Application does not connect a Member account to a bank or broker for transaction execution.</strong>
          </p>
          <p>
            <strong>The Application does not custody user funds or financial assets.</strong>
          </p>

          <hr />

          <p className="terms-effective">
            <strong>Effective date: 15 August 2026</strong>
          </p>
        </article>
      </div>
    </div>
  )
}

export default TermsPage
