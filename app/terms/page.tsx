import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Wallops Launch Alerts",
  description: "Terms of Service for Wallops Night-Launch Alert Service",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-white mb-2">Terms of Service</h1>
          <p className="text-slate-300 mb-8">Last updated: August 23, 2025</p>

          <div className="space-y-6 text-slate-200 leading-relaxed">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of the Wallops Night-Launch Alert Service
              (the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Use of the Service</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide a valid email address to receive alerts.</li>
              <li>You agree not to misuse the Service, interfere with its operation, or attempt to access it using a method other than the interface and instructions we provide.</li>
              <li>You are responsible for maintaining the security of your email account and subscription preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Subscriptions and Emails</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>By subscribing, you consent to receive email alerts related to Wallops launches.</li>
              <li>You can unsubscribe at any time using the link included in our emails.</li>
              <li>We may modify the frequency or content of alerts to improve service quality.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Prohibited Conduct</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Do not use the Service for unlawful purposes or to solicit unlawful activity.</li>
              <li>Do not attempt to probe, scan, or test the vulnerability of any system or network.</li>
              <li>Do not abuse rate limits or disrupt the Service for others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Intellectual Property</h2>
            <p>
              The Service may reference third-party content and trademarks that are the property of their
              respective owners. We do not claim ownership over NASA or Launch Library trademarks or content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind,
              express or implied. We do not warrant that alerts will be timely, accurate, or uninterrupted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, we will not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
              directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting
              from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Indemnification</h2>
            <p>
              You agree to indemnify and hold us harmless from any claims, liabilities, damages, losses, and
              expenses, including reasonable attorney fees, arising out of or in any way connected with your
              use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without notice, if we
              believe you have violated these Terms or to protect the Service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Changes to the Service or Terms</h2>
            <p>
              We may modify the Service or these Terms at any time. If changes are material, we will provide
              notice by posting the updated Terms on this page with an updated "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Governing Law</h2>
            <p>
              These Terms are governed by the laws applicable in your jurisdiction, without regard to conflict
              of law principles, unless a different jurisdiction is required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              Questions about these Terms? Please reach out via our project page on
              <a href="https://github.com/ryanmio/wallops-launch-alerts" target="_blank" rel="noopener noreferrer" className="text-slate-300 underline ml-1 hover:text-white">GitHub</a>.
            </p>
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}


