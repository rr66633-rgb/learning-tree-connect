export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp"
            alt="نشأة"
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">Naashah</h1>
        </div>

        <article className="prose prose-sm max-w-none text-gray-800" dir="ltr">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: June 20, 2026</p>

          <p>
            Naashah ("we," "our," or "us") operates the Naashah
            mobile application (the "App"). This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our App.
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Information We Collect</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Personal Information</h3>
          <p>
            When your account is created by the nursery administration, the following information may
            be collected:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Contact Information:</strong> Full name, email address, phone number
            </li>
            <li>
              <strong>Child Information:</strong> Child's name, date of birth, classroom assignment,
              medical information (allergies, conditions, medications), emergency contacts, authorized
              pickup persons
            </li>
            <li>
              <strong>Authentication Data:</strong> Login credentials, biometric authentication
              preferences (Face ID/Touch ID usage — biometric data never leaves your device)
            </li>
            <li>
              <strong>Device Information:</strong> Push notification tokens for delivering alerts
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Usage Data:</strong> Attendance records, pickup timestamps, message read
              receipts
            </li>
            <li>
              <strong>Device Identifiers:</strong> Push notification device tokens
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            How We Use Your Information
          </h2>
          <p>We use the collected information solely for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Providing nursery management services (attendance, daily reports, pickup management)
            </li>
            <li>Facilitating communication between parents and teachers</li>
            <li>
              Sending push notifications for important events (pickup alerts, new messages, daily
              reports)
            </li>
            <li>Ensuring child safety through authorized pickup verification</li>
            <li>Generating attendance and activity reports</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Data Sharing</h2>
          <p>
            We do <strong>NOT</strong> share your personal information with any third parties.
            Specifically:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No data is sold to advertisers or data brokers</li>
            <li>No advertising SDKs are integrated</li>
            <li>No cross-app tracking occurs</li>
            <li>No analytics services that identify individual users are used</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All data transmission is encrypted using HTTPS/TLS 1.3</li>
            <li>Authentication is handled via secure OAuth 2.0 tokens</li>
            <li>
              Role-based access control ensures parents only see their own children's data
            </li>
            <li>Server-side data is encrypted at rest</li>
            <li>
              Biometric data (Face ID/Touch ID) is processed locally on your device and never
              transmitted to our servers
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Children's Privacy</h2>
          <p>Our App handles information about children, but:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The App is used exclusively by adults (parents and nursery staff)</li>
            <li>Children do not directly use or interact with the App</li>
            <li>Children's data is entered and managed only by authorized adults</li>
            <li>We comply with applicable children's privacy regulations</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Data Retention</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account data is retained while the account is active</li>
            <li>Attendance and report history is retained for the academic year</li>
            <li>Messages are retained until archived or deleted by administration</li>
            <li>Upon account deactivation, personal data is deleted within 30 days</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal data held by us</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent for push notifications at any time</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, contact the nursery administration.
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by updating the "Last Updated" date.
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact:</p>
          <ul className="list-none pl-0 space-y-1">
            <li>
              <strong>Email:</strong> privacy@naashah.com
            </li>
            <li>
              <strong>Website:</strong>{" "}
              <a href="https://naashah.com" className="text-primary hover:underline">
                https://naashah.com
              </a>
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            App Tracking Transparency
          </h2>
          <p>
            This App does <strong>NOT</strong> use the AppTrackingTransparency framework. We do not
            track users across apps or websites owned by other companies.
          </p>
        </article>

        <footer className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
          <p>&copy; 2026 نشأة. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>
            <a href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
