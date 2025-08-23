import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Wallops Launch Alerts",
  description: "Privacy Policy for Wallops Night-Launch Alert Service",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-300 mb-8">Last updated: August 23, 2025</p>

          <div className="space-y-6 text-slate-200 leading-relaxed">
          <section>
            <p>
              This Privacy Policy describes how the Wallops Night-Launch Alert Service ("we", "us", or
              "our") collects, uses, and protects your information when you use our website and services
              (collectively, the "Service"). By using the Service, you agree to the collection and use of
              information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium text-white">Email address:</span> provided by you to receive
                launch alerts and related notifications.
              </li>
              <li>
                <span className="font-medium text-white">Technical data:</span> basic, non-identifying
                information such as browser type and approximate region may be collected in server logs for
                security and reliability.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To send you email alerts about Wallops launches you subscribed to receive.</li>
              <li>To operate, maintain, and improve the Service.</li>
              <li>To prevent abuse, protect against spam, and ensure service reliability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Sharing and Disclosure</h2>
            <p>
              We do not sell your personal information. We only share data with service providers that help us
              operate the Service (for example, email delivery or hosting). These providers are given access to
              the minimum necessary data and are obligated to protect it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Retention</h2>
            <p>
              We retain your email address for as long as you have an active subscription. If you unsubscribe,
              we will remove or anonymize your email address within a reasonable period unless we are required
              to retain it by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Your Choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You can unsubscribe at any time using the link provided in our emails.</li>
              <li>You may request access to or deletion of your data, subject to verification.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Cookies and Tracking</h2>
            <p>
              We aim to minimize tracking. If cookies or similar technologies are used, they are limited to
              essential functionality and service performance. You can control cookies through your browser
              settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Third-Party Services</h2>
            <p>
              Our Service may link to or integrate with third-party services (e.g., email providers,
              analytics, or hosting). Your use of third-party services is governed by their respective
              policies and terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Security</h2>
            <p>
              We take reasonable measures to protect your information from unauthorized access, alteration,
              disclosure, or destruction. However, no method of transmission or storage is completely secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with personal
              information, please contact us to request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">International Users</h2>
            <p>
              If you access the Service from outside your country, you consent to the processing of your
              information in the regions where our services operate. Data protection laws may differ from those
              in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the new policy on this page and
              update the "Last updated" date above. Your continued use of the Service after changes become
              effective signifies your acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              Questions about this policy? Please reach out via our project page on
              <a href="https://github.com/ryanmio/wallops-launch-alerts" target="_blank" rel="noopener noreferrer" className="text-slate-300 underline ml-1 hover:text-white">GitHub</a>.
            </p>
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}


